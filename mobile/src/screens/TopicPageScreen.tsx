import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import {
  ArrowLeft,
  Flame,
  Radio,
  Users,
  Award,
  TrendingUp,
  MessageSquare
} from 'lucide-react-native';
import { PostCard, PostData } from '../components/PostCard';

interface TopicPageProps {
  route: {
    params: {
      topicSlug: string;
      onBack?: () => void;
    };
  };
  onBackPress?: () => void;
}

export const TopicPageScreen: React.FC<TopicPageProps> = ({ route, onBackPress }) => {
  const slug = route?.params?.topicSlug || 'ipl';
  const handleBack = onBackPress || route?.params?.onBack;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'debates' | 'events' | 'creators'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);

  const fetchTopicDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/topics/${slug}/page`);
      setData(response);
      
      // Determine if followed
      const followedList = await api.get('/topics');
      // If user profile would have it, check. We simulate follow status based on initial mocks
      setIsFollowing(slug === 'ipl' || slug === 'ai');
    } catch (error) {
      console.error('Error loading topic details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicDetails();
  }, [slug]);

  const handleFollowToggle = async () => {
    if (!data?.topic?.id) return;
    try {
      const res = await api.post(`/topics/${data.topic.id}/follow`, {});
      setIsFollowing(res.following);
    } catch (error) {
      // Toggle locally for preview
      setIsFollowing(!isFollowing);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Topic Page...</Text>
      </View>
    );
  }

  if (!data?.topic) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Topic Page not found.</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Profile Panel */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>#{data.topic.name}</Text>
          <Text style={styles.headerSubtitle}>Topic Hub</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <Text style={styles.topicSymbol}>🏷️</Text>
          <Text style={styles.topicTitle}>#{data.topic.name}</Text>
          <Text style={styles.topicDesc}>{data.topic.description}</Text>

          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            onPress={handleFollowToggle}
          >
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
              {isFollowing ? 'Following Topic' : 'Follow Topic'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Toggle Navigation */}
        <View style={styles.tabsRow}>
          {(['posts', 'debates', 'events', 'creators'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dynamic Panels */}
        {activeTab === 'posts' && (
          <View style={styles.section}>
            {data.topPosts.length === 0 ? (
              <Text style={styles.emptyText}>No recent posts under this topic.</Text>
            ) : (
              data.topPosts.map((post: PostData) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </View>
        )}

        {activeTab === 'debates' && (
          <View style={styles.section}>
            {data.activeDebates.length === 0 ? (
              <Text style={styles.emptyText}>No active debates found. Start one on the feed!</Text>
            ) : (
              data.activeDebates.map((post: PostData) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </View>
        )}

        {activeTab === 'events' && (
          <View style={styles.section}>
            {data.liveEvents.length === 0 ? (
              <View style={styles.emptyEventCard}>
                <Radio size={24} color={Colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No live event rooms right now for #{data.topic.name}.</Text>
              </View>
            ) : (
              data.liveEvents.map((post: any) => (
                <View key={post.id} style={styles.eventRowCard}>
                  <View style={styles.eventInfo}>
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                    <Text style={styles.eventTitle}>{post.title}</Text>
                    <Text style={styles.eventDesc} numberOfLines={2}>{post.content}</Text>
                  </View>
                  <TouchableOpacity style={styles.joinEventBtn}>
                    <Text style={styles.joinEventBtnText}>Join Chat</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'creators' && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Top Influencing Creators in #{data.topic.name}</Text>
            {data.trendingCreators.map((creator: any, idx: number) => (
              <View key={creator.username} style={styles.creatorRow}>
                <Text style={styles.rankNum}>{idx + 1}</Text>
                <View style={styles.creatorAvatarBg}>
                  <Text style={styles.avatarText}>{creator.username[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorName}>{creator.name}</Text>
                  <Text style={styles.creatorTag}>@{creator.username} • <Text style={{ color: Colors.primaryAccent }}>{creator.identity}</Text></Text>
                </View>
                <View style={styles.xpRow}>
                  <Flame size={12} color={Colors.warning} />
                  <Text style={styles.xpVal}>{creator.reputation} xp</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  bannerCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    margin: 16,
    alignItems: 'center',
  },
  topicSymbol: {
    fontSize: 44,
    marginBottom: 10,
  },
  topicTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  topicDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  followBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  followBtnTextActive: {
    color: Colors.textSecondary,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Colors.primary,
  },
  tabBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 40,
  },
  emptyEventCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  eventRowCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  liveBadge: {
    backgroundColor: '#EF4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 6,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  eventTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  joinEventBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinEventBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginBottom: 8,
  },
  rankNum: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
  },
  creatorAvatarBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginHorizontal: 10,
  },
  avatarText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  creatorName: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  creatorTag: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  xpVal: {
    color: Colors.warning,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
});
