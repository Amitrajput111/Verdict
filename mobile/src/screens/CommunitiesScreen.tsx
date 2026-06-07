import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Users, X, Award, LogIn, LogOut, Trophy, Flame } from 'lucide-react-native';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar: string;
  banner?: string;
  member_count: number;
  post_count: number;
}

interface LeaderboardRow {
  username: string;
  name: string;
  avatar?: string;
  reputation: number;
  accuracy: number;
}

const getCommunityRank = (slug: string) => {
  switch (slug.toLowerCase()) {
    case 'cricket':
      return { rank: 1, text: '🏆 Rank #1', color: '#F59E0B' };
    case 'technology':
      return { rank: 2, text: '⚡ Rank #2', color: '#D946EF' };
    case 'movies':
      return { rank: 3, text: '🎬 Rank #3', color: '#3B82F6' };
    default:
      return { rank: 99, text: 'Rank #99', color: '#64748B' };
  }
};

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

export const CommunitiesScreen: React.FC = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedComm, setSelectedComm] = useState<Community | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [joinedState, setJoinedState] = useState<Record<string, boolean>>({});

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchCommunities = async () => {
    try {
      const data = await api.get('/communities');
      // Limit list to exactly Cricket, Movies, and Technology
      const mvpComm = data.filter((c: Community) =>
        ['cricket', 'movies', 'technology'].includes(c.slug.toLowerCase())
      );
      setCommunities(mvpComm);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleOpenDetails = async (comm: Community) => {
    setSelectedComm(comm);
    setModalVisible(true);
    setLoadingLeaderboard(true);
    try {
      const leaderboardData = await api.get(`/communities/${comm.slug}/leaderboard`);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleJoinToggle = async (comm: Community) => {
    if (!isAuthenticated) {
      alert('Please log in to join communities.');
      return;
    }

    try {
      const res = await api.post(`/communities/${comm.id}/join`);
      setJoinedState((prev) => ({ ...prev, [comm.id]: res.joined }));

      setCommunities((prev) =>
        prev.map((c) =>
          c.id === comm.id
            ? { ...c, member_count: res.joined ? c.member_count + 1 : Math.max(0, c.member_count - 1) }
            : c
        )
      );

      if (selectedComm && selectedComm.id === comm.id) {
        setSelectedComm((prev) =>
          prev
            ? { ...prev, member_count: res.joined ? prev.member_count + 1 : Math.max(0, prev.member_count - 1) }
            : null
        );
      }
    } catch (error) {
      alert('Failed to update membership');
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => {
    const isJoined = joinedState[item.id] || false;
    const rankInfo = getCommunityRank(item.slug);

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleOpenDetails(item)}>
        <View style={styles.cardRow}>
          <Text style={styles.avatarSymbol}>{item.avatar}</Text>
          <View style={styles.cardBody}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>c/{item.slug}</Text>
              <View style={[styles.rankBadge, { backgroundColor: rankInfo.color + '20', borderColor: rankInfo.color }]}>
                <Text style={[styles.rankBadgeText, { color: rankInfo.color }]}>{rankInfo.text}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.memberMeta}>
              <Users size={12} color={Colors.textSecondary} />
              <Text style={styles.memberMetaText}>{item.member_count} members</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.joinBtn, isJoined && styles.joinBtnActive]}
            onPress={() => handleJoinToggle(item)}
          >
            {isJoined ? (
              <LogOut size={16} color={Colors.textSecondary} />
            ) : (
              <LogIn size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Communities</Text>
      
      {/* Community Competition Summary Banner */}
      <View style={styles.competitionSummaryCard}>
        <Trophy size={20} color={Colors.warning} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.competitionTitle}>Community Leaderboard Race</Text>
          <Text style={styles.competitionSubtitle}>
            Groups earn ranks based on active member participation. Join and vote to help your community win!
          </Text>
        </View>
      </View>

      <FlatList
        data={communities}
        renderItem={renderCommunityItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Community Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>c/{selectedComm?.slug}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedComm && (
              <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {selectedComm.banner && (
                  <Image source={{ uri: selectedComm.banner }} style={styles.bannerImage} />
                )}

                <View style={styles.commProfileBlock}>
                  <Text style={styles.modalAvatarSymbol}>{selectedComm.avatar}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.modalCommName}>{selectedComm.name}</Text>
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor: getCommunityRank(selectedComm.slug).color + '20',
                          borderColor: getCommunityRank(selectedComm.slug).color,
                          marginLeft: 8
                        }
                      ]}
                    >
                      <Text style={[styles.rankBadgeText, { color: getCommunityRank(selectedComm.slug).color }]}>
                        {getCommunityRank(selectedComm.slug).text}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.modalCommDesc}>{selectedComm.description}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statCell}>
                      <Text style={styles.statVal}>{selectedComm.member_count}</Text>
                      <Text style={styles.statLabel}>Members</Text>
                    </View>
                    <View style={[styles.statCell, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
                      <Text style={styles.statVal}>{selectedComm.post_count}</Text>
                      <Text style={styles.statLabel}>Posts</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.modalActionJoinBtn,
                      joinedState[selectedComm.id] && styles.modalActionJoinBtnActive,
                    ]}
                    onPress={() => handleJoinToggle(selectedComm)}
                  >
                    <Text style={[styles.modalActionJoinBtnText, joinedState[selectedComm.id] && styles.modalActionJoinBtnTextActive]}>
                      {joinedState[selectedComm.id] ? 'Joined' : 'Join community'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Community Leaderboard */}
                <View style={styles.leaderboardSection}>
                  <View style={styles.leaderboardHeader}>
                    <Trophy size={16} color={Colors.warning} />
                    <Text style={styles.leaderboardTitle}>Top Community Predictors</Text>
                  </View>

                  {loadingLeaderboard ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
                  ) : leaderboard.length === 0 ? (
                    <Text style={styles.emptyLeaderboardText}>No members ranked yet.</Text>
                  ) : (
                    leaderboard.map((user, idx) => {
                      const userRole = getAuthorIdentity(user.username);
                      const mockStreak = (idx * 3 + 4) % 15 + 2;

                      return (
                        <View key={user.username} style={styles.leaderboardRow}>
                          <Text style={styles.rankNum}>{idx + 1}</Text>
                          <View style={styles.userProfileMini}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={styles.userProfileName}>{user.name}</Text>
                              <View style={styles.streakBadge}>
                                <Flame size={8} color={Colors.warning} fill={Colors.warning} />
                                <Text style={styles.streakText}>{mockStreak}d</Text>
                              </View>
                            </View>
                            <Text style={styles.userProfileUsername}>@{user.username} • <Text style={{ color: Colors.primaryAccent }}>{userRole}</Text></Text>
                          </View>
                          <View style={styles.badgeRow}>
                            <Award size={12} color={Colors.warning} />
                            <Text style={styles.repValue}>{user.reputation} xp</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
  },
  competitionSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 20,
  },
  competitionTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  competitionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  listContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSymbol: {
    fontSize: 28,
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  rankBadge: {
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  rankBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberMetaText: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '600',
  },
  joinBtn: {
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  joinBtnActive: {
    backgroundColor: Colors.border,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
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
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingBottom: 40,
  },
  bannerImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.background,
  },
  commProfileBlock: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalAvatarSymbol: {
    fontSize: 54,
    marginBottom: 8,
    marginTop: -40,
    backgroundColor: Colors.card,
    width: 80,
    height: 80,
    borderRadius: 40,
    textAlign: 'center',
    lineHeight: 76,
    borderWidth: 3,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  modalCommName: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  modalCommDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    width: '100%',
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  modalActionJoinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 42,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionJoinBtnActive: {
    backgroundColor: Colors.border,
  },
  modalActionJoinBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalActionJoinBtnTextActive: {
    color: Colors.textPrimary,
  },
  leaderboardSection: {
    padding: 20,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaderboardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },
  emptyLeaderboardText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rankNum: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
    width: 20,
  },
  userProfileMini: {
    flex: 1,
  },
  userProfileName: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  userProfileUsername: {
    color: Colors.textSecondary,
    fontSize: 10,
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
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repValue: {
    color: Colors.warning,
    fontWeight: 'bold',
    fontSize: 11,
    marginLeft: 3,
  },
});
