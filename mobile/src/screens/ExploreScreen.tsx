import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import {
  Search,
  Trophy,
  TrendingUp,
  Users,
  Award,
  X,
  Send,
  Radio,
  MessageSquare,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react-native';
import { getSocket, joinPostRoom, leavePostRoom, connectSocket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { TopicPageScreen } from './TopicPageScreen';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar: string;
  member_count: number;
}

interface LeaderboardUser {
  user_id: string;
  username: string;
  name: string;
  avatar?: string;
  reputation: number;
  accuracy: number;
  total_resolved_votes?: number;
}

interface LiveRoom {
  id: string;
  title: string;
  description: string;
  category: string;
  liveCount: number;
  avatar: string;
}

interface LiveComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_username: string;
  author_name: string;
  author_avatar?: string;
}

interface EventMoment {
  id: string;
  event_id: string;
  title: string;
  type: string;
  options: { id: number; text: string }[];
  total_votes: number;
}

const LIVE_ROOMS: LiveRoom[] = [
  {
    id: 'live_ipl',
    title: 'IPL Match Room',
    description: 'Live discussions, reactions, and side-joining for the IPL Match.',
    category: 'Cricket',
    liveCount: 1240,
    avatar: '🏏'
  },
  {
    id: 'live_worldcup',
    title: 'World Cup Room',
    description: 'Live updates and comments for the World Cup.',
    category: 'Cricket',
    liveCount: 3820,
    avatar: '🏆'
  },
  {
    id: 'live_apple',
    title: 'Apple Launch Room',
    description: 'Real-time reactions to the new Apple Keynote and releases.',
    category: 'Technology',
    liveCount: 940,
    avatar: '💻'
  },
  {
    id: 'live_movies',
    title: 'Movie Release Room',
    description: 'Live reviews and debate on the latest movie releases.',
    category: 'Movies',
    liveCount: 510,
    avatar: '🎬'
  }
];

const EXPLORE_TOPICS = [
  { id: 't1', name: 'IPL', slug: 'ipl', emoji: '🏏' },
  { id: 't2', name: 'World Cup', slug: 'world-cup', emoji: '🏆' },
  { id: 't3', name: 'Artificial Intelligence', slug: 'ai', emoji: '🧠' },
  { id: 't4', name: 'Startups', slug: 'startups', emoji: '🚀' },
  { id: 't5', name: 'Bollywood', slug: 'bollywood', emoji: '🍿' },
  { id: 't6', name: 'Apple', slug: 'apple', emoji: '🍏' },
  { id: 't7', name: 'Android', slug: 'android', emoji: '🤖' },
  { id: 't8', name: 'GTA 7', slug: 'gta7', emoji: '🎮' }
];

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

export const ExploreScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);

  const [leaderboardTab, setLeaderboardTab] = useState<'reputation' | 'accuracy'>('reputation');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Topics System V3 states
  const [activeTopicSlug, setActiveTopicSlug] = useState<string | null>(null);
  const [followedTopicsIds, setFollowedTopicsIds] = useState<string[]>(['t1', 't3']); // Pre-follow IPL & AI

  // Live Room States
  const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [roomComments, setRoomComments] = useState<LiveComment[]>([]);
  const [inputText, setInputText] = useState('');
  const [roomPost, setRoomPost] = useState<any>(null);
  const [roomVotedOptionId, setRoomVotedOptionId] = useState<number | null>(null);
  const [roomVoteStats, setRoomVoteStats] = useState<{ optionId: number; count: number }[]>([]);
  const [roomTotalVotes, setRoomTotalVotes] = useState(0);
  const [loadingRoomDetails, setLoadingRoomDetails] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // V3 Live Event timeline moments
  const [roomMoments, setRoomMoments] = useState<EventMoment[]>([]);
  const [votedMomentOptionId, setVotedMomentOptionId] = useState<Record<string, number>>({});

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const commentsEndRef = useRef<ScrollView>(null);

  const fetchExploreData = async () => {
    setLoadingCommunities(true);
    try {
      const data = await api.get('/communities');
      const mvpComm = data.filter((c: Community) =>
        ['cricket', 'movies', 'technology'].includes(c.slug.toLowerCase())
      );
      setCommunities(mvpComm);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCommunities(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const path = leaderboardTab === 'reputation' ? '/leaderboards/reputation' : '/leaderboards/accuracy';
      const data = await api.get(path);
      setLeaderboardData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchExploreData();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardTab]);

  const handleTopicFollowToggle = async (topicId: string) => {
    try {
      const res = await api.post(`/topics/${topicId}/follow`, {});
      if (res.following) {
        setFollowedTopicsIds((prev) => [...prev, topicId]);
      } else {
        setFollowedTopicsIds((prev) => prev.filter((id) => id !== topicId));
      }
    } catch (error) {
      // Fallback
      setFollowedTopicsIds((prev) =>
        prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
      );
    }
  };

  // Handle entering Live Room
  const handleEnterRoom = async (room: LiveRoom) => {
    setSelectedRoom(room);
    setRoomModalVisible(true);
    setLoadingRoomDetails(true);
    setRoomComments([]);
    setRoomPost(null);
    setRoomVotedOptionId(null);
    setRoomVoteStats([]);
    setRoomTotalVotes(0);
    setRoomMoments([]);

    try {
      // 1. Fetch live room details/post representation
      const postData = await api.get(`/posts/${room.id}`);
      setRoomPost(postData);
      setRoomVotedOptionId(postData.user_voted_option_id);
      
      // 2. Fetch comment history
      const commentsData = await api.get(`/comments/${room.id}`);
      setRoomComments(commentsData);

      // 3. Fetch Event Moments chronological timeline
      const momentsData = await api.get(`/posts/${room.id}/moments`);
      setRoomMoments(momentsData);

      // 4. Connect to WebSockets
      joinPostRoom(room.id);
      const socket = getSocket();

      socket.on('new_comment', (comment: LiveComment) => {
        setRoomComments((prev) => {
          if (prev.some((c) => c.id === comment.id)) return prev;
          return [...prev, comment];
        });
        setTimeout(() => commentsEndRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('vote_update', (data: { postId: string; voteStats: { optionId: number; count: number }[]; totalVotes: number }) => {
        if (data.postId === room.id) {
          setRoomVoteStats(data.voteStats);
          setRoomTotalVotes(data.totalVotes);
        }
      });
      
      if (postData.options) {
        const stats = postData.options.map((opt: any) => ({
          optionId: opt.id,
          count: opt.id === postData.user_voted_option_id ? 1 : 0
        }));
        setRoomVoteStats(stats);
      }
    } catch (error) {
      console.error('Error entering live room:', error);
    } finally {
      setLoadingRoomDetails(false);
      setTimeout(() => commentsEndRef.current?.scrollToEnd({ animated: true }), 300);
    }
  };

  // Close Live Room Modal
  const handleCloseRoom = () => {
    if (selectedRoom) {
      leavePostRoom(selectedRoom.id);
      const socket = getSocket();
      socket.off('new_comment');
      socket.off('vote_update');
    }
    setRoomModalVisible(false);
    setSelectedRoom(null);
  };

  const handleSendComment = async () => {
    if (!isAuthenticated) {
      alert('Please log in to participate!');
      return;
    }
    if (!selectedRoom || inputText.trim() === '') return;

    const content = inputText.trim();
    setInputText('');

    try {
      await api.post('/comments', {
        postId: selectedRoom.id,
        content
      });
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  // Join Side on Post
  const handleJoinSide = async (optionId: number) => {
    if (!isAuthenticated) {
      alert('Please log in to join a side!');
      return;
    }
    if (!selectedRoom || roomVotedOptionId !== null || isSubmittingVote) return;

    setIsSubmittingVote(true);
    try {
      const response = await api.post(`/votes/${selectedRoom.id}`, { selectedOptionId: optionId });
      setRoomVotedOptionId(optionId);
      if (response.voteStats) {
        setRoomVoteStats(response.voteStats);
        const sum = response.voteStats.reduce((acc: number, item: any) => acc + item.count, 0);
        setRoomTotalVotes(sum);
      }
    } catch (error) {
      console.error('Error casting side vote:', error);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Vote on specific timeline moment
  const handleVoteMoment = async (momentId: string, optionId: number) => {
    if (!isAuthenticated) {
      alert('Please log in to participate in moments!');
      return;
    }
    if (votedMomentOptionId[momentId] !== undefined) return;

    try {
      await api.post(`/votes/${momentId}`, { selectedOptionId: optionId });
      setVotedMomentOptionId((prev) => ({ ...prev, [momentId]: optionId }));
      setRoomMoments((prev) =>
        prev.map((m) => (m.id === momentId ? { ...m, total_votes: m.total_votes + 1 } : m))
      );
    } catch (error) {
      // Fallback
      setVotedMomentOptionId((prev) => ({ ...prev, [momentId]: optionId }));
      setRoomMoments((prev) =>
        prev.map((m) => (m.id === momentId ? { ...m, total_votes: m.total_votes + 1 } : m))
      );
    }
  };

  const getOptionPercentage = (optionId: number) => {
    if (roomTotalVotes === 0) return 0;
    const stat = roomVoteStats.find((s) => s.optionId === optionId);
    if (!stat) return 0;
    return Math.round((stat.count / roomTotalVotes) * 100);
  };

  // If Topic Page is active, intercept rendering
  if (activeTopicSlug !== null) {
    return (
      <TopicPageScreen
        route={{ params: { topicSlug: activeTopicSlug } }}
        onBackPress={() => {
          setActiveTopicSlug(null);
          fetchExploreData();
        }}
      />
    );
  }

  const filteredCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardUser; index: number }) => {
    const isTopThree = index < 3;
    const medalColor = index === 0 ? '#F59E0B' : index === 1 ? '#94A3B8' : '#B45309';
    const userRole = getAuthorIdentity(item.username);
    const mockStreak = (index * 5 + 3) % 20 + 2;

    return (
      <View style={styles.leaderboardRow}>
        <View style={styles.rankContainer}>
          {isTopThree ? (
            <Trophy size={18} color={medalColor} />
          ) : (
            <Text style={styles.rankText}>{index + 1}</Text>
          )}
        </View>

        <View style={styles.avatarMini}>
          <Text style={styles.avatarMiniText}>{item.username[0].toUpperCase()}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.userName}>{item.name}</Text>
            <View style={styles.streakBadge}>
              <Flame size={10} color={Colors.warning} fill={Colors.warning} />
              <Text style={styles.streakText}>{mockStreak}d</Text>
            </View>
          </View>
          <Text style={styles.userBadgeText}>{userRole}</Text>
        </View>

        <View style={styles.scoreContainer}>
          {leaderboardTab === 'reputation' ? (
            <View style={styles.scoreRow}>
              <Award size={13} color={Colors.warning} />
              <Text style={styles.scoreVal}>{item.reputation} xp</Text>
            </View>
          ) : (
            <View style={styles.scoreRow}>
              <TrendingUp size={13} color={Colors.success} />
              <Text style={styles.scoreVal}>{item.accuracy.toFixed(1)}%</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <Text style={styles.title}>Explore</Text>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search topics, events, communities..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Discover / Follow Topics horizontal chips slider */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Sparkles size={18} color={Colors.primaryAccent} />
          <Text style={styles.sectionTitle}>Follow Topics</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicsScroll}>
          {EXPLORE_TOPICS.map((topic) => {
            const isFav = followedTopicsIds.includes(topic.id);
            return (
              <TouchableOpacity
                key={topic.id}
                style={[styles.topicChip, isFav && styles.topicChipActive]}
                onPress={() => setActiveTopicSlug(topic.slug)}
              >
                <Text style={styles.topicChipEmoji}>{topic.emoji}</Text>
                <Text style={[styles.topicChipText, isFav && styles.topicChipTextActive]}>
                  {topic.name}
                </Text>
                <TouchableOpacity
                  style={styles.topicChipFollow}
                  onPress={() => handleTopicFollowToggle(topic.id)}
                >
                  <Text style={[styles.topicChipFollowText, isFav && { color: Colors.primaryAccent }]}>
                    {isFav ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Live Event Rooms Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Radio size={18} color={Colors.error} />
          <Text style={styles.sectionTitle}>Live Event Rooms</Text>
          <View style={styles.livePulseDot} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRoomsList}>
          {LIVE_ROOMS.map((room) => (
            <TouchableOpacity key={room.id} style={styles.liveRoomCard} onPress={() => handleEnterRoom(room)}>
              <View style={styles.liveRoomAvatarBg}>
                <Text style={styles.liveRoomEmoji}>{room.avatar}</Text>
              </View>
              
              <View style={styles.liveTagContainer}>
                <View style={styles.pulsingDot} />
                <Text style={styles.liveTagText}>{room.liveCount} Live</Text>
              </View>

              <Text style={styles.liveRoomTitle} numberOfLines={1}>{room.title}</Text>
              <Text style={styles.liveRoomDesc} numberOfLines={2}>{room.description}</Text>
              
              <TouchableOpacity style={styles.enterRoomBtn} onPress={() => handleEnterRoom(room)}>
                <Text style={styles.enterRoomBtnText}>Enter Room</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Communities Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Trending Communities</Text>
        </View>

        {loadingCommunities ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communitiesList}>
            {filteredCommunities.map((item) => (
              <View key={item.id} style={styles.communityCard}>
                <Text style={styles.commAvatar}>{item.avatar}</Text>
                <Text style={styles.commName}>c/{item.slug}</Text>
                <Text style={styles.commDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.commCount}>{item.member_count} members</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Leaderboard Section */}
      <View style={[styles.section, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 20 }]}>
        <View style={styles.sectionHeader}>
          <Trophy size={18} color={Colors.warning} />
          <Text style={styles.sectionTitle}>Global Leaderboards</Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, leaderboardTab === 'reputation' && styles.tabButtonActive]}
            onPress={() => setLeaderboardTab('reputation')}
          >
            <Text style={[styles.tabButtonText, leaderboardTab === 'reputation' && styles.tabButtonTextActive]}>
              Participation Rank
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, leaderboardTab === 'accuracy' && styles.tabButtonActive]}
            onPress={() => setLeaderboardTab('accuracy')}
          >
            <Text style={[styles.tabButtonText, leaderboardTab === 'accuracy' && styles.tabButtonTextActive]}>
              Accuracy
            </Text>
          </TouchableOpacity>
        </View>

        {loadingLeaderboard ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 40 }} />
        ) : (
          <FlatList
            data={leaderboardData}
            renderItem={renderLeaderboardItem}
            keyExtractor={(item) => item.user_id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyLeaderboard}>
                <Text style={styles.emptyLeaderboardText}>No users ranked yet.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Real-time Socket.IO Live Event Modal */}
      {selectedRoom && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={roomModalVisible}
          onRequestClose={handleCloseRoom}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseRoom} style={styles.closeBtn}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.modalTitleText}>{selectedRoom.title}</Text>
                  <View style={styles.liveHeaderBadge}>
                    <Text style={styles.liveHeaderBadgeText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitleText}>{selectedRoom.liveCount} participating • Synced</Text>
              </View>
            </View>

            {loadingRoomDetails ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.modalLoadingText}>Entering room socket...</Text>
              </View>
            ) : (
              <View style={styles.modalBody}>
                {/* Event Moments Chronological Timeline (Scrollable) */}
                {roomMoments.length > 0 && (
                  <View style={styles.timelineContainer}>
                    <Text style={styles.timelineHeader}>⏱️ EVENT TIMELINE MOMENTS</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentsScroll}>
                      {roomMoments.map((moment, idx) => {
                        const votedOpt = votedMomentOptionId[moment.id];
                        const isVoted = votedOpt !== undefined;
                        
                        return (
                          <View key={moment.id} style={styles.momentCard}>
                            <View style={styles.momentHeaderRow}>
                              <Clock size={10} color={Colors.primaryAccent} />
                              <Text style={styles.momentIndexText}>Moment #{idx + 1}</Text>
                            </View>
                            <Text style={styles.momentQuestionText}>{moment.title}</Text>
                            
                            <View style={styles.momentOptionsRow}>
                              {moment.options.map((opt) => {
                                const selected = votedOpt === opt.id;
                                return (
                                  <TouchableOpacity
                                    key={opt.id}
                                    style={[
                                      styles.momentOptBtn,
                                      selected && { backgroundColor: Colors.primary },
                                      isVoted && !selected && { opacity: 0.6 }
                                    ]}
                                    disabled={isVoted}
                                    onPress={() => handleVoteMoment(moment.id, opt.id)}
                                  >
                                    <Text style={styles.momentOptBtnText}>{opt.text}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                            <Text style={styles.momentVotesText}>{moment.total_votes} votes cast</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Tribe Side Joining Section */}
                {roomPost && roomPost.options && (
                  <View style={styles.tribeSideContainer}>
                    <Text style={styles.tribeSideHeader}>JOIN A SIDE</Text>
                    <Text style={styles.tribeQuestionText}>{roomPost.title}</Text>
                    
                    <View style={styles.tribeOptionsRow}>
                      {roomPost.options.map((opt: any, idx: number) => {
                        const isVoted = roomVotedOptionId === opt.id;
                        const percentage = getOptionPercentage(opt.id);
                        const isFirstOption = idx === 0;
                        const sideColor = isFirstOption ? '#10B981' : '#EF4444';
                        
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.tribeSideButton,
                              { borderColor: sideColor },
                              roomVotedOptionId !== null && styles.tribeSideButtonVoted
                            ]}
                            disabled={roomVotedOptionId !== null || isSubmittingVote}
                            onPress={() => handleJoinSide(opt.id)}
                          >
                            {roomVotedOptionId !== null && (
                              <View
                                style={[
                                  styles.tribePercentFill,
                                  {
                                    backgroundColor: sideColor + '20',
                                    width: `${percentage}%`
                                  }
                                ]}
                              />
                            )}

                            <View style={styles.tribeButtonContent}>
                              <Text
                                style={[
                                  styles.tribeOptionText,
                                  isVoted && { fontWeight: '800' }
                                ]}
                              >
                                {opt.text}
                              </Text>
                              
                              {roomVotedOptionId !== null && (
                                <Text style={[styles.tribePercentText, { color: sideColor }]}>
                                  {percentage}%
                                </Text>
                              )}
                            </View>

                            {isVoted && (
                              <View style={[styles.checkIndicator, { backgroundColor: sideColor }]}>
                                <CheckCircle2 size={12} color="#FFFFFF" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Comment Feed */}
                <ScrollView
                  ref={commentsEndRef}
                  style={styles.chatScrollView}
                  contentContainerStyle={styles.chatScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {roomComments.length === 0 ? (
                    <View style={styles.emptyChatState}>
                      <MessageSquare size={36} color={Colors.textMuted} style={{ marginBottom: 10 }} />
                      <Text style={styles.emptyChatText}>No messages yet. Be the first to start the debate!</Text>
                    </View>
                  ) : (
                    roomComments.map((comment) => {
                      const commenterRole = getAuthorIdentity(comment.author_username);
                      
                      return (
                        <View key={comment.id} style={styles.chatBubbleContainer}>
                          <View style={styles.chatAvatar}>
                            <Text style={styles.chatAvatarText}>
                              {comment.author_username[0].toUpperCase()}
                            </Text>
                          </View>
                          
                          <View style={styles.chatBubbleContent}>
                            <View style={styles.chatMetaRow}>
                              <Text style={styles.chatAuthorName}>{comment.author_name}</Text>
                              <Text style={styles.chatAuthorUsername}>@{comment.author_username}</Text>
                              <Text style={styles.chatRoleBadge}>{commenterRole}</Text>
                            </View>
                            <Text style={styles.chatCommentText}>{comment.content}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* Message input */}
                <View style={styles.inputBarContainer}>
                  <View style={styles.inputFieldContainer}>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder={isAuthenticated ? "Type a message..." : "Please log in to participate"}
                      placeholderTextColor={Colors.textMuted}
                      value={inputText}
                      onChangeText={setInputText}
                      editable={isAuthenticated}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendMsgBtn,
                        (inputText.trim() === '' || !isAuthenticated) && styles.sendMsgBtnDisabled
                      ]}
                      disabled={inputText.trim() === '' || !isAuthenticated}
                      onPress={handleSendComment}
                    >
                      <Send size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
  },
  searchHeader: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
    marginLeft: 6,
  },
  topicsScroll: {
    paddingRight: 16,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  topicChipActive: {
    borderColor: Colors.primaryAccent,
    backgroundColor: 'rgba(217, 70, 239, 0.08)',
  },
  topicChipEmoji: {
    fontSize: 12,
    marginRight: 6,
  },
  topicChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  topicChipTextActive: {
    color: Colors.textPrimary,
  },
  topicChipFollow: {
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  topicChipFollowText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
  },
  liveRoomsList: {
    paddingRight: 16,
  },
  liveRoomCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    width: 200,
    marginRight: 12,
    position: 'relative',
  },
  liveRoomAvatarBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  liveRoomEmoji: {
    fontSize: 22,
  },
  liveTagContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveTagText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveRoomTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  liveRoomDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 14,
    height: 30,
  },
  enterRoomBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterRoomBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  communitiesList: {
    paddingRight: 16,
  },
  communityCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    width: 140,
    marginRight: 10,
    alignItems: 'center',
  },
  commAvatar: {
    fontSize: 28,
    marginBottom: 6,
  },
  commName: {
    color: Colors.primaryAccent,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    height: 28,
    marginBottom: 8,
  },
  commCount: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginBottom: 8,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarMiniText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3F3F46',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 1,
  },
  userBadgeText: {
    color: Colors.primaryAccent,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreVal: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 11,
    marginLeft: 3,
  },
  emptyLeaderboard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyLeaderboardText: {
    color: Colors.textMuted,
    fontSize: 12,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  closeBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  modalTitleText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  liveHeaderBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  liveHeaderBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  modalSubtitleText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  modalBody: {
    flex: 1,
  },
  timelineContainer: {
    backgroundColor: Colors.card,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timelineHeader: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  momentsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  momentCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    width: 170,
    marginRight: 8,
  },
  momentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  momentIndexText: {
    color: Colors.primaryAccent,
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  momentQuestionText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    height: 32,
  },
  momentOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  momentOptBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 6,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  momentOptBtnText: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: '600',
  },
  momentVotesText: {
    color: Colors.textMuted,
    fontSize: 8,
    textAlign: 'right',
  },
  tribeSideContainer: {
    backgroundColor: Colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tribeSideHeader: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tribeQuestionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tribeOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tribeSideButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  tribeSideButtonVoted: {
    backgroundColor: Colors.background,
    borderWidth: 0.5,
  },
  tribePercentFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  tribeButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 2,
  },
  tribeOptionText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  tribePercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  checkIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyChatState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyChatText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  chatBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 10,
  },
  chatAvatarText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  chatBubbleContent: {
    flex: 1,
    backgroundColor: Colors.card,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  chatAuthorName: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 4,
  },
  chatAuthorUsername: {
    color: Colors.textMuted,
    fontSize: 10,
    marginRight: 6,
  },
  chatRoleBadge: {
    color: Colors.primaryAccent,
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: Colors.background,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  chatCommentText: {
    color: Colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  inputBarContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
    backgroundColor: Colors.card,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  modalTextInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  sendMsgBtn: {
    backgroundColor: Colors.primary,
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendMsgBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
