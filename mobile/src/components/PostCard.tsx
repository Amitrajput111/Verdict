import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Image, Dimensions, Platform } from 'react-native';
import { MessageSquare, Share2, Award, CheckCircle, Clock, Heart, Repeat, Lock } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { joinPostRoom, leavePostRoom, getSocket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { usePostStore } from '../store/usePostStore';
import { SideChatModal } from './SideChatModal';
import { addInAppNotification } from '../services/notifications';

interface Option {
  id: number;
  text: string;
}

export interface PostData {
  id: string;
  author_id: string;
  author_username: string;
  author_name: string;
  author_avatar?: string;
  author_reputation: number;
  community_id?: string;
  community_name?: string;
  community_slug?: string;
  type: 'video' | 'image' | 'text' | 'poll' | 'prediction' | 'debate';
  title: string;
  content: string;
  media_url?: string;
  thumbnail_url?: string;
  vote_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  options?: Option[];
  expires_at?: string;
  resolved: boolean;
  correct_option_id?: number;
  user_voted_option_id?: number | null;
}

interface PostCardProps {
  post: PostData;
  onPressComment?: (postId: string) => void;
  onVoteSuccess?: () => void;
}

const getAuthorIdentity = (username: string) => {
  switch (username) {
    case 'admin': return '👑 System Admin';
    case 'cricket_guru': return '🏏 Cricket Analyst';
    case 'cinephile': return '🎬 Movie Critic';
    case 'pixel_king': return '🎮 Tech Explorer';
    case 'silicon_valley': return '🧠 Startup Observer';
    default: return '🌟 Explorer';
  }
};

const getUserTribe = (username: string) => {
  switch (username) {
    case 'silicon_valley': return { text: '🍏 Apple Gang', color: '#10B981' };
    case 'cricket_guru': return { text: '🏏 Team India', color: '#3B82F6' };
    case 'cinephile': return { text: '🎬 Marvel Fans', color: '#EF4444' };
    case 'pixel_king': return { text: '🤖 Android Gang', color: '#D946EF' };
    default: return null;
  }
};

const getSideColor = (idx: number) => {
  return idx === 0 ? '#10B981' : idx === 1 ? '#EF4444' : Colors.primary; // Green vs Red tribal highlights
};

export const PostCard: React.FC<PostCardProps> = ({ post: initialPost, onPressComment, onVoteSuccess }) => {
  const [post, setPost] = useState<PostData>(initialPost);
  const [votedOptionId, setVotedOptionId] = useState<number | null>(initialPost.user_voted_option_id ?? null);
  const [voteStats, setVoteStats] = useState<{ optionId: number; count: number }[]>([]);
  const [totalVotes, setTotalVotes] = useState<number>(initialPost.vote_count);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [sideChatVisible, setSideChatVisible] = useState(false);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Zustand Post Actions
  const repostPost = usePostStore((state) => state.repostPost);
  const isReposted = usePostStore((state) => state.repostedIds.includes(post.id));

  // Quick Reactions State
  const [reactions, setReactions] = useState({
    agree: Math.floor(Math.random() * 20) + 12,
    disagree: Math.floor(Math.random() * 8) + 2,
    hot: Math.floor(Math.random() * 15) + 5,
    smart: Math.floor(Math.random() * 12) + 4,
    funny: Math.floor(Math.random() * 10) + 1,
  });
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  const hasExpired = post.expires_at ? new Date() > new Date(post.expires_at) : false;
  const showResults = votedOptionId !== null || hasExpired || post.resolved;

  useEffect(() => {
    if (post.options) {
      const initialStats = post.options.map((opt) => ({
        optionId: opt.id,
        count: opt.id === votedOptionId ? getOptionInitialVotes(opt.id) + 1 : getOptionInitialVotes(opt.id)
      }));
      setVoteStats(initialStats);
    }
  }, [post.options, votedOptionId]);

  const getOptionInitialVotes = (id: number) => {
    // Generate deterministic mock counts for visual diversity
    return (post.id.charCodeAt(0) * (id + 1) * 3) % 25;
  };

  useEffect(() => {
    if (['poll', 'prediction', 'debate'].includes(post.type)) {
      joinPostRoom(post.id);
      const socket = getSocket();

      socket.on('vote_update', (data: { postId: string; voteStats: { optionId: number; count: number }[]; totalVotes: number }) => {
        if (data.postId === post.id) {
          setVoteStats(data.voteStats);
          setTotalVotes(data.totalVotes);
          setPost((prev) => ({ ...prev, vote_count: data.totalVotes }));

          if (votedOptionId !== null) {
            const votedStat = data.voteStats.find((s) => s.optionId === votedOptionId);
            if (votedStat && data.totalVotes > 0) {
              const percentage = Math.round((votedStat.count / data.totalVotes) * 100);
              if (percentage < 45) {
                const opponentPercentage = 100 - percentage;
                addInAppNotification({
                  type: 'side_losing',
                  title: '⚔️ Your side is losing!',
                  body: `"${post.title}" is now ${percentage}% vs ${opponentPercentage}%`,
                  debateId: post.id
                });
              }
            }
          }
        }
      });

      return () => {
        leavePostRoom(post.id);
        socket.off('vote_update');
      };
    }
  }, [post.id, post.type, votedOptionId]);

  const handleVote = async (optionId: number) => {
    if (!isAuthenticated) {
      alert('Please log in to participate!');
      return;
    }
    if (showResults || isSubmittingVote) return;

    setIsSubmittingVote(true);
    try {
      const response = await api.post(`/votes/${post.id}`, { selectedOptionId: optionId });
      setVotedOptionId(optionId);
      let newStats = response.voteStats;
      let sum = totalVotes + 1;

      if (response.voteStats) {
        setVoteStats(response.voteStats);
        sum = response.voteStats.reduce((acc: number, item: any) => acc + item.count, 0);
        setTotalVotes(sum);
        newStats = response.voteStats;
      } else {
        newStats = voteStats.map(s => s.optionId === optionId ? { ...s, count: s.count + 1 } : s);
        setVoteStats(newStats);
        setTotalVotes(sum);
      }

      const votedStat = newStats.find((s: any) => s.optionId === optionId);
      if (votedStat && sum > 0) {
        const percentage = Math.round((votedStat.count / sum) * 100);
        if (percentage < 45) {
          const opponentPercentage = 100 - percentage;
          addInAppNotification({
            type: 'side_losing',
            title: '⚔️ Your side is losing!',
            body: `"${post.title}" is now ${percentage}% vs ${opponentPercentage}%`,
            debateId: post.id
          });
        }
      }

      if (onVoteSuccess) onVoteSuccess();
    } catch (error: any) {
      // Offline fallback handling
      setVotedOptionId(optionId);
      setVoteStats(prev => prev.map(s => s.optionId === optionId ? { ...s, count: s.count + 1 } : s));
      setTotalVotes(prev => prev + 1);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleReactionPress = (type: 'agree' | 'disagree' | 'hot' | 'smart' | 'funny') => {
    if (!isAuthenticated) {
      alert('Please log in to react!');
      return;
    }
    setReactions((prev) => {
      const isCurrent = activeReaction === type;
      const nextCounts = { ...prev };
      
      if (activeReaction) {
        nextCounts[activeReaction as keyof typeof prev] = Math.max(0, nextCounts[activeReaction as keyof typeof prev] - 1);
      }
      
      if (!isCurrent) {
        nextCounts[type] = nextCounts[type] + 1;
        setActiveReaction(type);
      } else {
        setActiveReaction(null);
      }
      
      return nextCounts;
    });
  };

  const handleRepost = () => {
    if (!isAuthenticated) {
      alert('Please log in to bookmark!');
      return;
    }
    repostPost(post.id);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this topic on Verdict: "${post.title}"`,
      });
      await api.post(`/posts/${post.id}/share`);
      setPost((prev) => ({ ...prev, share_count: prev.share_count + 1 }));
    } catch (error) {
      console.error(error);
    }
  };

  const getOptionCount = (optionId: number) => {
    const stat = voteStats.find((s) => s.optionId === optionId);
    return stat ? stat.count : 0;
  };

  const getOptionPercentage = (optionId: number) => {
    if (totalVotes === 0) return 0;
    const count = getOptionCount(optionId);
    return Math.round((count / totalVotes) * 100);
  };

  return (
    <View style={styles.card}>
      {/* Header Info (Identity Over Reputation Score) */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          {post.author_avatar ? (
            <Image source={{ uri: post.author_avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{post.author_username[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.authorMeta}>
            <Text style={styles.authorName}>{post.author_name}</Text>
            {/* Identity badge & Tribe badge displays */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <View style={styles.identityBadge}>
                <Text style={styles.identityText}>{getAuthorIdentity(post.author_username)}</Text>
              </View>
              {getUserTribe(post.author_username) && (
                <View
                  style={[
                    styles.tribeBadge,
                    {
                      backgroundColor: getUserTribe(post.author_username)!.color + '15',
                      borderColor: getUserTribe(post.author_username)!.color
                    }
                  ]}
                >
                  <Text style={[styles.tribeBadgeText, { color: getUserTribe(post.author_username)!.color }]}>
                    {getUserTribe(post.author_username)!.text}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {post.community_name && (
          <View style={styles.communityTag}>
            <Text style={styles.communityTagText}>c/{post.community_slug}</Text>
          </View>
        )}
      </View>

      {/* Main Post Media (strict 9:16 aspect ratio) */}
      {post.media_url && (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: post.media_url }} style={styles.mediaImage} resizeMode="cover" />
          <View style={styles.typeOverlay}>
            <Text style={styles.typeOverlayText}>{post.type.toUpperCase()}</Text>
          </View>
        </View>
      )}

      {/* Title Details Area */}
      <View style={styles.contentBlock}>
        <Text style={styles.title}>{post.title}</Text>
        {post.content ? <Text style={styles.description}>{post.content}</Text> : null}
      </View>

      {/* Tribe Side Selection System */}
      {post.options && post.options.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionHeading}>
            {showResults ? "Consensus Statistics:" : "Join A Side:"}
          </Text>
          {post.options.map((option, index) => {
            const percentage = getOptionPercentage(option.id);
            const isSelected = votedOptionId === option.id;
            const sideIndicator = index === 0 ? '🟢' : index === 1 ? '🔴' : '🔵';
            const optionColor = getSideColor(index);

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  isSelected && { borderColor: optionColor, borderWidth: 2 }
                ]}
                onPress={() => handleVote(option.id)}
                disabled={showResults || isSubmittingVote}
                activeOpacity={0.8}
              >
                {/* Consensus Percentage Bars */}
                {showResults && (
                  <View
                    style={[
                      styles.progressFill,
                      { 
                        width: `${percentage}%`,
                        backgroundColor: `${optionColor}22` // Transparent side tint
                      }
                    ]}
                  />
                )}

                <View style={styles.optionLabelContainer}>
                  <View style={styles.optionTextRow}>
                    <Text style={styles.optionIndicator}>{sideIndicator}</Text>
                    <Text style={[
                      styles.optionText, 
                      isSelected && { color: optionColor, fontWeight: '700' }
                    ]}>
                      {option.text}
                    </Text>
                    {isSelected && (
                      <Text style={[styles.joinedBadge, { color: optionColor }]}>
                        (Joined Side)
                      </Text>
                    )}
                  </View>

                  {showResults && (
                    <Text style={[styles.percentageText, { color: optionColor }]}>
                      {percentage}%
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Action Footer Indicator */}
      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Clock size={11} color={Colors.textMuted} />
          <Text style={styles.metaBadgeText}>
            {hasExpired ? 'Closed' : post.resolved ? 'Resolved' : 'Active Debate'}
          </Text>
        </View>
        <Text style={styles.totalVotesText}>{totalVotes} on sides</Text>
      </View>

      {/* Quick Opinions Reactions Bar (👍, 👎, 🔥, 🧠, 😂) */}
      <View style={styles.reactionsBar}>
        {[
          { key: 'agree', label: '👍 Agree' },
          { key: 'disagree', label: '👎 Disagree' },
          { key: 'hot', label: '🔥 Hot' },
          { key: 'smart', label: '🧠 Smart' },
          { key: 'funny', label: '😂 Funny' }
        ].map((rx) => {
          const isSelected = activeReaction === rx.key;
          const count = reactions[rx.key as keyof typeof reactions];
          
          return (
            <TouchableOpacity
              key={rx.key}
              style={[
                styles.reactionButton,
                isSelected && styles.reactionButtonActive
              ]}
              onPress={() => handleReactionPress(rx.key as any)}
            >
              <Text style={[
                styles.reactionLabel,
                isSelected && { color: Colors.primaryAccent, fontWeight: '800' }
              ]}>
                {rx.label}
              </Text>
              <Text style={[
                styles.reactionCount,
                isSelected && { color: Colors.primaryAccent }
              ]}>
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Comments & Bookmarks Action Bar */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onPressComment && onPressComment(post.id)}
        >
          <MessageSquare size={20} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{post.comment_count} Comments</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleRepost}>
          <Repeat size={20} color={isReposted ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.actionText, isReposted && { color: Colors.primary }]}>
            {isReposted ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share2 size={20} color={Colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        {votedOptionId !== null && (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              { 
                backgroundColor: getSideColor(votedOptionId) + '15',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4
              }
            ]} 
            onPress={() => setSideChatVisible(true)}
          >
            <MessageSquare size={16} color={getSideColor(votedOptionId)} style={{ marginRight: 4 }} />
            <Text style={[styles.actionText, { color: getSideColor(votedOptionId), fontWeight: '700' }]}>Side Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {votedOptionId !== null && post.options && (
        <SideChatModal
          visible={sideChatVisible}
          onClose={() => setSideChatVisible(false)}
          postId={post.id}
          sideId={votedOptionId}
          sideName={post.options.find(o => o.id === votedOptionId)?.text || 'My Side'}
          sideColor={getSideColor(votedOptionId)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  authorMeta: {
    justifyContent: 'center',
  },
  authorName: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  identityBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  identityText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  tribeBadge: {
    borderWidth: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    marginLeft: 6,
    alignSelf: 'flex-start',
  },
  tribeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  communityTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  communityTagText: {
    color: Colors.primaryAccent,
    fontSize: 11,
    fontWeight: 'bold',
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 9 / 16, // Strict vertical scaling
    backgroundColor: '#0F172A',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  typeOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeOverlayText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  contentBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  chartContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionHeading: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  optionLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  optionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    marginRight: 6,
    fontSize: 12,
  },
  optionText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  joinedBadge: {
    fontSize: 10,
    marginLeft: 6,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaBadgeText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  totalVotesText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  reactionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    justifyContent: 'space-between',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    marginBottom: 4,
  },
  reactionButtonActive: {
    backgroundColor: 'rgba(217, 70, 239, 0.1)',
    borderColor: Colors.primaryAccent,
  },
  reactionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  reactionCount: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 5,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '700',
  },
});
