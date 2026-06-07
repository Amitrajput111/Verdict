import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator, Modal, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Image, Animated } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { PostCard, PostData } from '../components/PostCard';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { X, Send, Award, CornerDownRight, Search, Bell, Heart, MessageCircle, Repeat } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { usePostStore } from '../store/usePostStore';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore } from '../store/useNotificationStore';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_HEIGHT = SCREEN_HEIGHT - 160; 

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  author_name: string;
  author_avatar?: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
}

export const FeedScreen: React.FC = () => {
  const [feedType, setFeedType] = useState<'forYou' | 'clips'>('forYou');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const navigation = useNavigation<any>();

  // Notifications store hooks
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const markOneRead = useNotificationStore((state) => state.markOneRead);
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SCREEN_HEIGHT * 0.6)).current;

  const toggleDrawer = (show: boolean) => {
    if (show) {
      setDrawerVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 30,
        friction: 7,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SCREEN_HEIGHT * 0.6,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setDrawerVisible(false));
    }
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  const handleNotificationPress = (item: any) => {
    markOneRead(item.id);
    toggleDrawer(false);
    if (item.debateId) {
      navigation.navigate('DebateScreen', { postId: item.debateId });
    }
  };

  const formatTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(isoString).toLocaleDateString();
  };

  const renderNotificationItem = ({ item }: { item: any }) => {
    const isLosing = item.type === 'side_losing';
    const isReply = item.type === 'reply';
    const isDaily = item.type === 'daily_debate';
    const isStreak = item.type === 'streak_reminder';
    const isBadge = item.type === 'badge_earned';

    let iconText = '🔔';
    let iconBg = '#1E293B';
    if (isLosing) { iconText = '⚔️'; iconBg = 'rgba(239, 68, 68, 0.15)'; }
    else if (isReply) { iconText = '💬'; iconBg = 'rgba(124, 58, 237, 0.15)'; }
    else if (isDaily) { iconText = '🔥'; iconBg = 'rgba(245, 158, 11, 0.15)'; }
    else if (isStreak) { iconText = '⚡'; iconBg = 'rgba(16, 185, 129, 0.15)'; }
    else if (isBadge) { iconText = '🏆'; iconBg = 'rgba(217, 70, 239, 0.15)'; }

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.notificationUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.notificationIconBg, { backgroundColor: iconBg }]}>
          <Text style={{ fontSize: 16 }}>{iconText}</Text>
        </View>
        <View style={styles.notificationTextWrap}>
          <Text style={[styles.notificationItemTitle, !item.isRead && { fontWeight: '800' }]}>
            {item.title}
          </Text>
          <Text style={styles.notificationItemBody}>{item.body}</Text>
          <Text style={styles.notificationItemTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Zustand stores
  const posts = usePostStore((state) => state.posts);
  const setPosts = usePostStore((state) => state.setPosts);
  const user = useAuthStore((state) => state.user);

  // Comments sheet state
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  // Custom overlays vote choice state
  const [overlayVotedId, setOverlayVotedId] = useState<Record<string, number>>({});

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70, 
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const visibleItem = viewableItems[0].item;
      if (visibleItem.type === 'video') {
        setActiveVideoId(visibleItem.id);
      } else {
        setActiveVideoId(null);
      }
    }
  }).current;

  const fetchFeed = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    try {
      const data = await api.get('/posts?limit=15&page=1');
      // Set posts in Zustand store for synchronization
      setPosts(data);
      
      const videoPosts = data.filter((p: PostData) => p.type === 'video');
      if (videoPosts.length > 0 && feedType === 'clips') {
        setActiveVideoId(videoPosts[0].id);
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  useEffect(() => {
    // Reset video active status when toggling tabs
    const videoPosts = posts.filter((p: PostData) => p.type === 'video');
    if (feedType === 'clips' && videoPosts.length > 0) {
      setActiveVideoId(videoPosts[0].id);
    } else {
      setActiveVideoId(null);
    }
  }, [feedType, posts]);

  const handleOpenComments = async (postId: string) => {
    setActivePostId(postId);
    setCommentsVisible(true);
    setLoadingComments(true);
    setReplyingTo(null);
    try {
      const commentsData = await api.get(`/comments/${postId}`);
      setComments(commentsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !activePostId) return;

    const payload = {
      postId: activePostId,
      content: newCommentText,
      parentId: replyingTo ? replyingTo.id : undefined,
    };

    try {
      const freshComment = await api.post('/comments', payload);
      setComments((prev) => [...prev, freshComment]);
      setNewCommentText('');

      if (replyingTo) {
        addNotification({
          type: 'reply',
          title: `💬 @${freshComment.author_username} replied to your comment`,
          body: `"${freshComment.content.substring(0, 40)}${freshComment.content.length > 40 ? '...' : ''}"`,
          debateId: activePostId || undefined
        });
      }

      setReplyingTo(null);
      
      // Update comment count on post in store
      setPosts(
        posts.map((p) => (p.id === activePostId ? { ...p, comment_count: p.comment_count + 1 } : p))
      );
    } catch (error) {
      alert('Failed to post comment');
    }
  };

  const handleOverlayVote = async (postId: string, optionId: number) => {
    try {
      await api.post(`/votes/${postId}`, { selectedOptionId: optionId });
      setOverlayVotedId(prev => ({ ...prev, [postId]: optionId }));
      
      // Sync local posts state
      setPosts(
        posts.map((p) => (p.id === postId ? { ...p, vote_count: p.vote_count + 1 } : p))
      );
    } catch (error: any) {
      alert(error.message || 'Already voted or expired');
    }
  };

  const renderCommentItem = ({ item }: { item: Comment }) => {
    const isReply = !!item.parent_id;
    return (
      <View style={[styles.commentCard, isReply && styles.replyCommentCard]}>
        {isReply && <CornerDownRight size={14} color={Colors.textMuted} style={{ marginRight: 6, marginTop: 4 }} />}
        
        {item.author_avatar ? (
          <Image source={{ uri: item.author_avatar }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Text style={styles.commentAvatarText}>{item.author_username[0].toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.commentContentContainer}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.author_name}</Text>
            <Text style={styles.commentUsername}>@{item.author_username}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
          {!isReply && (
            <TouchableOpacity 
              style={styles.replyButton} 
              onPress={() => setReplyingTo(item)}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderForYouItem = ({ item }: { item: PostData }) => (
    <PostCard
      post={item}
      onPressComment={handleOpenComments}
      onVoteSuccess={fetchFeed}
    />
  );

  const renderClipsItem = ({ item }: { item: PostData }) => {
    const isPlaying = item.id === activeVideoId;
    const votedId = overlayVotedId[item.id] !== undefined ? overlayVotedId[item.id] : null;

    // Simulated prediction choices for vertical videos to fulfill: "easily try to predict and answer"
    const videoOptions = [
      { id: 0, text: 'Bullish 📈' },
      { id: 1, text: 'Bearish 📉' }
    ];

    return (
      <View style={styles.cell}>
        <Video
          source={{ uri: item.media_url || '' }}
          rate={1.0}
          volume={1.0}
          isMuted={true}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isPlaying}
          isLooping
          useNativeControls={false}
          style={styles.videoPlayer}
        />
        {/* Semi-transparent dark overlay gradient for readability */}
        <View style={styles.videoOverlay}>
          <View style={styles.videoBottomPanel}>
            {/* Info details */}
            <View style={styles.videoAuthorRow}>
              {item.author_avatar ? (
                <Image source={{ uri: item.author_avatar }} style={styles.videoAvatar} />
              ) : (
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarMiniText}>{item.author_username[0].toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.videoAuthorText}>@{item.author_username}</Text>
              <View style={styles.videoRep}>
                <Award size={10} color={Colors.warning} />
                <Text style={styles.videoRepText}>{item.author_reputation}</Text>
              </View>
            </View>

            <Text style={styles.videoTitleText}>{item.title}</Text>
            <Text style={styles.videoDescText} numberOfLines={2}>{item.content}</Text>

            {/* Quick Prediction overlay panel (inside the video slide) */}
            <View style={styles.overlayPredictionPanel}>
              <Text style={styles.overlayPredictionTitle}>Predict this Trend:</Text>
              <View style={styles.overlayButtonsRow}>
                {videoOptions.map((opt) => {
                  const hasVoted = votedId !== null;
                  const isSelected = votedId === opt.id;
                  
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.overlayVoteBtn,
                        isSelected && styles.overlayVoteBtnSelected,
                        hasVoted && !isSelected && { opacity: 0.6 }
                      ]}
                      onPress={() => handleOverlayVote(item.id, opt.id)}
                      disabled={hasVoted}
                    >
                      <Text style={styles.overlayVoteBtnText}>{opt.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
          
          {/* Vertical action bar buttons */}
          <View style={styles.videoActionsContainer}>
            <TouchableOpacity 
              style={styles.floatButton} 
              onPress={() => handleOpenComments(item.id)}
            >
              <View style={styles.floatIconCircle}>
                <MessageCircle size={22} color="#0F172A" />
              </View>
              <Text style={styles.floatButtonLabel}>{item.comment_count}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Filter lists based on toggle state
  const forYouPosts = posts.filter((p) => p.type !== 'video');
  const clipsPosts = posts.filter((p) => p.type === 'video');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navbar Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          {user?.profile.avatar ? (
            <Image source={{ uri: user.profile.avatar }} style={styles.headerUserAvatar} />
          ) : (
            <View style={styles.headerUserAvatarPlaceholder}>
              <Text style={styles.headerUserAvatarText}>V</Text>
            </View>
          )}
          <Text style={styles.logoText}>Verdict</Text>
        </View>
        
        {/* Toggleable Feed selection tabs (For You vs Clips) */}
        <View style={styles.feedToggleContainer}>
          <TouchableOpacity 
            style={[styles.feedToggleTab, feedType === 'forYou' && styles.feedToggleTabActive]}
            onPress={() => setFeedType('forYou')}
          >
            <Text style={[styles.feedToggleTabText, feedType === 'forYou' && styles.feedToggleTabTextActive]}>
              For You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.feedToggleTab, feedType === 'clips' && styles.feedToggleTabActive]}
            onPress={() => setFeedType('clips')}
          >
            <Text style={[styles.feedToggleTabText, feedType === 'clips' && styles.feedToggleTabTextActive]}>
              Clips
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.headerIconBtn, { marginRight: 8 }]}>
            <Search size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => toggleDrawer(true)}>
            <Bell size={22} color={Colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Renders For You list (Mixed scrolls) or Clips list (Vertical snaps) */}
      {feedType === 'forYou' ? (
        <FlatList
          data={forYouPosts}
          renderItem={forYouPosts.length > 0 ? renderForYouItem : null}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.forYouListContent}
          refreshing={refreshing}
          onRefresh={() => fetchFeed(true)}
          ListEmptyComponent={
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyFeedText}>No posts available.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={clipsPosts}
          renderItem={renderClipsItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={CELL_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshing={refreshing}
          onRefresh={() => fetchFeed(true)}
          style={{ flex: 1 }}
        />
      )}

      {/* Slide-Up Comments Drawer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commentsVisible}
        onRequestClose={() => setCommentsVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentsVisible(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Replying indicator */}
            {replyingTo && (
              <View style={styles.replyingBar}>
                <Text style={styles.replyingText}>
                  Replying to @{replyingTo.author_username}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <X size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Comment list */}
            {loadingComments ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                data={comments}
                renderItem={renderCommentItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.commentsList}
                ListEmptyComponent={
                  <View style={styles.emptyComments}>
                    <Text style={styles.emptyCommentsText}>Be the first to share an opinion!</Text>
                  </View>
                }
              />
            )}

            {/* Input Bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                placeholderTextColor={Colors.textMuted}
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleAddComment}>
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {drawerVisible && (
        <TouchableOpacity
          style={styles.drawerBackdrop}
          activeOpacity={1}
          onPress={() => toggleDrawer(false)}
        />
      )}
      <Animated.View
        style={[
          styles.notificationDrawer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Notifications</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
              <Text style={styles.markReadBtnText}>Mark all read</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleDrawer(false)} style={{ marginLeft: 16 }}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={notifications.slice(0, 20)}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          ListEmptyComponent={
            <View style={styles.drawerEmpty}>
              <Bell size={32} color={Colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.drawerEmptyText}>No notifications yet. Start debating!</Text>
            </View>
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
    marginLeft: 8,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerUserAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  feedToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 3,
    width: 170,
  },
  feedToggleTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 16,
  },
  feedToggleTabActive: {
    backgroundColor: Colors.background,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  feedToggleTabText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  feedToggleTabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 2,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forYouListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyFeedText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  cell: {
    height: CELL_HEIGHT,
    width: '100%',
    backgroundColor: '#0F172A',
  },
  cardCell: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardWrapper: {
    width: '100%',
  },
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  videoBottomPanel: {
    width: '85%',
    marginBottom: 10,
  },
  videoAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarMiniText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  videoAuthorText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  videoRep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  videoRepText: {
    color: Colors.warning,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  videoTitleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  videoDescText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  // Transparent prediction overlays (Clips Feed overlay widget)
  overlayPredictionPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    marginTop: 4,
  },
  overlayPredictionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  overlayButtonsRow: {
    flexDirection: 'row',
  },
  overlayVoteBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  overlayVoteBtnSelected: {
    backgroundColor: Colors.primary,
  },
  overlayVoteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoActionsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'center',
  },
  floatButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  floatIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  floatButtonLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: 'bold',
  },
  // Comments Drawer styles (Light style)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '65%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  replyingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  replyingText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    padding: 16,
    paddingBottom: 40,
  },
  commentCard: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  replyCommentCard: {
    marginLeft: 24,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    paddingLeft: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  commentContentContainer: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  commentAuthor: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  commentUsername: {
    color: Colors.textMuted,
    fontSize: 11,
    marginLeft: 6,
  },
  commentText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  replyButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 20,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    zIndex: 9,
  },
  notificationDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#1E293B',
  },
  drawerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 6,
  },
  markReadBtnText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  drawerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  drawerEmptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#0F172A',
  },
  notificationUnread: {
    backgroundColor: 'rgba(124, 58, 237, 0.03)',
  },
  notificationIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTextWrap: {
    flex: 1,
  },
  notificationItemTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationItemBody: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  notificationItemTime: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
});
