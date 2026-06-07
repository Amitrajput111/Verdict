import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Dimensions, Modal, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { usePostStore } from '../store/usePostStore';
import { ReputationDisplay } from '../components/ReputationDisplay';
import { PostCard, PostData } from '../components/PostCard';
import { LogOut, Film, Award, MessageSquare, Target, Edit2, Repeat, Lock, Flame, Info, Users, Eye, Clock, BarChart2, X } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_ITEM_SIZE = SCREEN_WIDTH / 3 - 2;

const AVATAR_PRESETS = [
  { label: '👨‍💻 Developer', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  { label: '👩‍💼 Designer', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { label: '👨‍🎤 Gamer', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
  { label: '👩‍💻 Writer', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
  { label: '👨‍🎨 Creator', url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150' },
  { label: '🎬 Cinephile', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' }
];

export const ProfileScreen: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  
  const repostedIds = usePostStore((state) => state.repostedIds);

  const [profileDetails, setProfileDetails] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [allPosts, setAllPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // V2 Profile Tabs: Overview, Posts, Videos, Communities, Saved Posts
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'videos' | 'communities' | 'saved'>('overview');

  // Edit profile & Privacy toggles
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [hideBio, setHideBio] = useState(false);
  const [hideReputation, setHideReputation] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // MOCK Streaks & Joined Groups for V2 MVP
  const streakCount = 7; 
  const joinedCommunities = [
    { slug: 'cricket', name: 'Cricket', icon: '🏏', rank: 'Rank #1' },
    { slug: 'technology', name: 'Technology', icon: '💻', rank: 'Rank #2' }
  ];

  // V3 configurations
  const [creatorDashboardVisible, setCreatorDashboardVisible] = useState(false);
  const [creatorAnalytics, setCreatorAnalytics] = useState<any>(null);
  const [loadingCreatorAnalytics, setLoadingCreatorAnalytics] = useState(false);

  const followedTopics = [
    { slug: 'ipl', name: 'IPL', emoji: '🏏' },
    { slug: 'ai', name: 'Artificial Intelligence', emoji: '🧠' }
  ];

  const joinedTribes = [
    { slug: 'team-india', name: 'Team India', avatar: '🏏', memberCount: 4500, color: '#3B82F6' },
    { slug: 'apple-gang', name: 'Apple Gang', avatar: '🍏', memberCount: 1350, color: '#A855F7' }
  ];

  const fetchCreatorAnalytics = async () => {
    setLoadingCreatorAnalytics(true);
    try {
      const response = await api.get('/creator/dashboard');
      setCreatorAnalytics(response);
    } catch (e) {
      console.error(e);
      setCreatorAnalytics({
        metrics: { views: 12000, watchTimeMinutes: 800, sideJoins: 820, commentsCount: 240, sharesCount: 110, reachScore: 65, influenceScore: 58 },
        followerGrowthTrend: [10, 25, 45, 55, 75, 95, 120],
        eventParticipationRate: 85,
        status: { isVerifiedCreator: true, isCommunityLeader: true, isEventHost: false }
      });
    } finally {
      setLoadingCreatorAnalytics(false);
    }
  };

  const fetchProfileAndPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const details = await api.get('/users/me');
      
      const combinedDetails = {
        ...details,
        hide_bio: user.profile.hide_bio || false,
        hide_reputation: user.profile.hide_reputation || false,
        is_private: user.profile.is_private || false
      };
      
      setProfileDetails(combinedDetails);

      // Seed inputs
      setEditName(combinedDetails.name || '');
      setEditBio(combinedDetails.bio || '');
      setEditAvatar(combinedDetails.avatar || '');
      setHideBio(combinedDetails.hide_bio);
      setHideReputation(combinedDetails.hide_reputation);
      setIsPrivate(combinedDetails.is_private);

      const allPostsData = await api.get('/posts');
      setAllPosts(allPostsData);

      const authored = allPostsData.filter((p: PostData) => p.author_id === user.id);
      setUserPosts(authored);
    } catch (error) {
      console.error('Error loading profile details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndPosts();
  }, [user]);

  const handleChooseDeviceFile = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          setEditAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      Alert.alert('Browser Only', 'Device uploading is optimized for the web.');
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Display name is required.');
      return;
    }
    
    setSavingProfile(true);
    try {
      const updated = await api.put('/users/me', {
        name: editName.trim(),
        bio: editBio.trim(),
        avatar: editAvatar.trim() || null
      });

      setProfileDetails((prev: any) => ({
        ...prev,
        name: updated.name,
        bio: updated.bio,
        avatar: updated.avatar,
        hide_bio: hideBio,
        hide_reputation: hideReputation,
        is_private: isPrivate
      }));

      updateProfile({
        name: updated.name,
        bio: updated.bio,
        avatar: updated.avatar,
        hide_bio: hideBio,
        hide_reputation: hideReputation,
        is_private: isPrivate
      });

      setEditModalVisible(false);
      Alert.alert('Success', 'Profile settings updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading || !profileDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const getFilteredData = () => {
    if (activeTab === 'posts') {
      return userPosts.filter((p) => p.type !== 'video');
    }
    if (activeTab === 'videos') {
      return userPosts.filter((p) => p.type === 'video');
    }
    if (activeTab === 'saved') {
      return allPosts.filter((p) => repostedIds.includes(p.id));
    }
    return []; // 'overview' and 'communities' handled in list header view
  };

  const renderGridItem = ({ item }: { item: PostData }) => {
    const displayImage = item.media_url || item.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200';
    return (
      <TouchableOpacity style={styles.gridItem}>
        <Image source={{ uri: displayImage }} style={styles.gridImage} />
        {item.type === 'video' && (
          <View style={styles.gridVideoBadge}>
            <Film size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Profile Header Block */}
      <View style={styles.row}>
        {profileDetails.avatar ? (
          <Image source={{ uri: profileDetails.avatar }} style={styles.avatarLarge} />
        ) : (
          <View style={styles.avatarLargePlaceholder}>
            <Text style={styles.avatarTextLarge}>
              {profileDetails.username[0].toUpperCase()}
            </Text>
          </View>
        )}

        {/* User Stats counters */}
        <View style={styles.statsContainer}>
          <View style={styles.statCell}>
            <Text style={styles.statNumber}>{userPosts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statNumber}>{profileDetails.followers_count || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statNumber}>{profileDetails.following_count || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      {/* User Info Details */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>{profileDetails.name}</Text>
          {profileDetails.is_private && (
            <Lock size={14} color={Colors.primaryAccent} style={{ marginLeft: 6 }} />
          )}
        </View>

        {/* Verification Status badges row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          {profileDetails.username === 'admin' && (
            <View style={[styles.verifBadge, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
              <Text style={[styles.verifBadgeText, { color: '#EF4444' }]}>Event Host</Text>
            </View>
          )}
          {(profileDetails.username === 'cricket_guru' || profileDetails.username === 'silicon_valley') && (
            <View style={[styles.verifBadge, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
              <Text style={[styles.verifBadgeText, { color: '#10B981' }]}>Community Leader</Text>
            </View>
          )}
          <View style={[styles.verifBadge, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED' }]}>
            <Text style={[styles.verifBadgeText, { color: Colors.primary }]}>Verified Creator</Text>
          </View>
        </View>

        <Text style={styles.usernameText}>@{profileDetails.username}</Text>
        
        {/* Hide Bio toggle check */}
        {!profileDetails.hide_bio && (
          <Text style={styles.bioText}>
            {profileDetails.bio || "Participation enthusiast on Verdict. Joining sides and sharing perspectives."}
          </Text>
        )}
      </View>

      {/* Action triggers */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <TouchableOpacity 
          style={[styles.editProfileButton, { flex: 1, marginRight: 8 }]}
          onPress={() => setEditModalVisible(true)}
        >
          <Edit2 size={13} color={Colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.editProfileButton, { flex: 1, backgroundColor: Colors.primary + '15', borderColor: Colors.primary }]}
          onPress={() => {
            fetchCreatorAnalytics();
            setCreatorDashboardVisible(true);
          }}
        >
          <Award size={13} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.editProfileButtonText, { color: Colors.primary }]}>Creator Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Tabs selection row */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'posts', label: 'Snaps' },
            { id: 'videos', label: 'Clips' },
            { id: 'communities', label: 'Groups' },
            { id: 'saved', label: 'Saved' }
          ].map((tab) => (
            <TouchableOpacity 
              key={tab.id}
              style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Conditional Overview tab layout */}
      {activeTab === 'overview' && (
        <View style={styles.tabContentBlock}>
          {/* Activity Streaks display widget */}
          <View style={styles.streakCard}>
            <View style={styles.streakIconCircle}>
              <Flame size={20} color="#FFFFFF" />
            </View>
            <View style={styles.streakTextMeta}>
              <Text style={styles.streakTitle}>{streakCount} Day Streak 🔥</Text>
              <Text style={styles.streakDesc}>You are actively participating! Keep voting to increase consistency rewards.</Text>
            </View>
          </View>

          {/* Identity Badges List */}
          {!profileDetails.hide_reputation && (
            <View style={styles.overviewSection}>
              <Text style={styles.sectionHeading}>Identity Badges</Text>
              <ReputationDisplay
                reputation={profileDetails.reputation}
                accuracy={profileDetails.accuracy || 0.0}
                badges={profileDetails.badges || []}
              />
            </View>
          )}

          {/* Followed Topics Slider */}
          <View style={styles.overviewSection}>
            <Text style={styles.sectionHeading}>Followed Topics</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
              {followedTopics.map(topic => (
                <View key={topic.slug} style={styles.topicMiniChip}>
                  <Text style={{ fontSize: 10, marginRight: 4 }}>{topic.emoji}</Text>
                  <Text style={styles.topicMiniChipText}>#{topic.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Joined Identity Tribes */}
          <View style={styles.overviewSection}>
            <Text style={styles.sectionHeading}>Joined Tribes</Text>
            {joinedTribes.map(tribe => (
              <View key={tribe.slug} style={styles.communityRowItem}>
                <Text style={styles.commAvatarItem}>{tribe.avatar}</Text>
                <View style={styles.commMetaItem}>
                  <Text style={styles.commNameItem}>{tribe.name}</Text>
                  <Text style={styles.commRankItem}>{tribe.memberCount} members</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Joined Communities list */}
          <View style={styles.overviewSection}>
            <Text style={styles.sectionHeading}>Joined Communities</Text>
            {joinedCommunities.map(comm => (
              <View key={comm.slug} style={styles.communityRowItem}>
                <Text style={styles.commAvatarItem}>{comm.icon}</Text>
                <View style={styles.commMetaItem}>
                  <Text style={styles.commNameItem}>c/{comm.slug}</Text>
                  <Text style={styles.commRankItem}>{comm.rank}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Conditional Communities tab layout */}
      {activeTab === 'communities' && (
        <View style={styles.tabContentBlock}>
          <Text style={styles.sectionHeading}>Active Group Memberships</Text>
          {joinedCommunities.length === 0 ? (
            <Text style={styles.emptyTextItem}>You have not joined any community tribes yet.</Text>
          ) : (
            joinedCommunities.map(comm => (
              <View key={comm.slug} style={styles.communityGridCard}>
                <Text style={styles.gridCardIcon}>{comm.icon}</Text>
                <View style={styles.gridCardMeta}>
                  <Text style={styles.gridCardName}>c/{comm.slug} Tribe</Text>
                  <Text style={styles.gridCardBadge}>{comm.rank} Competition standing</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );

  const filteredData = getFilteredData();

  return (
    <View style={styles.container}>
      {/* Navbar top */}
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>Profile Settings</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {activeTab === 'posts' || activeTab === 'videos' ? (
        <FlatList
          data={filteredData}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          key={activeTab}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No content uploaded.</Text>
            </View>
          }
        />
      ) : activeTab === 'saved' ? (
        <FlatList
          data={filteredData}
          renderItem={({ item }) => <PostCard post={item} />}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Repeat size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No saved posts yet.</Text>
            </View>
          }
        />
      ) : (
        /* For Overview and Communities, scrollable via FlatList header components */
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings / Profile Edit</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.avatarEditContainer}>
                {editAvatar ? (
                  <Image source={{ uri: editAvatar }} style={styles.avatarPreview} />
                ) : (
                  <View style={styles.avatarPreviewPlaceholder}>
                    <Text style={styles.avatarPreviewPlaceholderText}>?</Text>
                  </View>
                )}
                <Text style={styles.avatarPreviewLabel}>Avatar Preview</Text>
                
                {Platform.OS === 'web' && (
                  <TouchableOpacity style={styles.uploadBtn} onPress={handleChooseDeviceFile}>
                    <Text style={styles.uploadBtnText}>Upload from Device</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.inputLabel}>Choose a Preset Avatar:</Text>
              <View style={styles.presetGrid}>
                {AVATAR_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.presetCard,
                      editAvatar === preset.url && styles.presetCardActive
                    ]}
                    onPress={() => setEditAvatar(preset.url)}
                  >
                    <Image source={{ uri: preset.url }} style={styles.presetImage} />
                    <Text style={styles.presetLabel} numberOfLines={1}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form Inputs */}
              <View style={styles.form}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={Colors.textMuted}
                  value={editName}
                  onChangeText={setEditName}
                />

                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.textInput, styles.bioInput]}
                  placeholder="Tell others what you predict, your interests, or tags..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={editBio}
                  onChangeText={setEditBio}
                />

                <Text style={styles.inputLabel}>Avatar Image Link (URL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Paste direct image link"
                  placeholderTextColor={Colors.textMuted}
                  value={editAvatar}
                  onChangeText={setEditAvatar}
                />

                <Text style={styles.sectionDivider}>Privacy & Hides</Text>
                
                <TouchableOpacity 
                  style={styles.checkboxRow}
                  onPress={() => setHideBio(!hideBio)}
                >
                  <View style={[styles.checkbox, hideBio && styles.checkboxChecked]}>
                    {hideBio && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Hide Bio from public profile</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.checkboxRow}
                  onPress={() => setHideReputation(!hideReputation)}
                >
                  <View style={[styles.checkbox, hideReputation && styles.checkboxChecked]}>
                    {hideReputation && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Hide Badges & Reputation standings</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.checkboxRow}
                  onPress={() => setIsPrivate(!isPrivate)}
                >
                  <View style={[styles.checkbox, isPrivate && styles.checkboxChecked]}>
                    {isPrivate && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Enable Lock Badge (Private Mode)</Text>
                </TouchableOpacity>
              </View>

              {/* Action Save Button */}
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Settings</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Creator Dashboard Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={creatorDashboardVisible}
        onRequestClose={() => setCreatorDashboardVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { height: '90%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BarChart2 size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Creator Dashboard</Text>
              </View>
              <TouchableOpacity onPress={() => setCreatorDashboardVisible(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingCreatorAnalytics ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ color: Colors.textSecondary, marginTop: 10 }}>Loading creator stats...</Text>
              </View>
            ) : creatorAnalytics ? (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                {/* Profile Overview in Dashboard */}
                <View style={styles.dashboardProfileHeader}>
                  <View style={styles.dashboardProfileInfo}>
                    <Text style={styles.dashboardProfileName}>{profileDetails.name}</Text>
                    <Text style={styles.dashboardProfileHandle}>@{profileDetails.username}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                    {creatorAnalytics.status?.isVerifiedCreator && (
                      <View style={[styles.verifBadge, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED', marginRight: 6 }]}>
                        <Text style={[styles.verifBadgeText, { color: Colors.primary }]}>Verified Creator</Text>
                      </View>
                    )}
                    {creatorAnalytics.status?.isCommunityLeader && (
                      <View style={[styles.verifBadge, { backgroundColor: '#10B98115', borderColor: '#10B981', marginRight: 6 }]}>
                        <Text style={[styles.verifBadgeText, { color: '#10B981' }]}>Community Leader</Text>
                      </View>
                    )}
                    {creatorAnalytics.status?.isEventHost && (
                      <View style={[styles.verifBadge, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
                        <Text style={[styles.verifBadgeText, { color: '#EF4444' }]}>Event Host</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.sectionHeading}>Participation Reach & Influence</Text>
                
                {/* Progress bars for scores */}
                <View style={styles.scoresContainer}>
                  <View style={styles.progressRow}>
                    <View style={styles.progressLabelContainer}>
                      <Text style={styles.progressLabel}>Reach Score</Text>
                      <Text style={styles.progressValue}>{creatorAnalytics.metrics?.reachScore || 0}/100</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBarFill, { width: `${creatorAnalytics.metrics?.reachScore || 0}%`, backgroundColor: Colors.primary }]} />
                    </View>
                  </View>

                  <View style={styles.progressRow}>
                    <View style={styles.progressLabelContainer}>
                      <Text style={styles.progressLabel}>Influence Score</Text>
                      <Text style={styles.progressValue}>{creatorAnalytics.metrics?.influenceScore || 0}/100</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBarFill, { width: `${creatorAnalytics.metrics?.influenceScore || 0}%`, backgroundColor: Colors.primaryAccent }]} />
                    </View>
                  </View>

                  <View style={styles.progressRow}>
                    <View style={styles.progressLabelContainer}>
                      <Text style={styles.progressLabel}>Event Participation</Text>
                      <Text style={styles.progressValue}>{creatorAnalytics.eventParticipationRate || 0}%</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBarFill, { width: `${creatorAnalytics.eventParticipationRate || 0}%`, backgroundColor: Colors.success }]} />
                    </View>
                  </View>
                </View>

                {/* Key Metrics Grid */}
                <Text style={styles.sectionHeading}>Core Metrics</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricGridCard}>
                    <View style={styles.metricGridHeader}>
                      <Eye size={16} color={Colors.primary} />
                      <Text style={styles.metricGridTitle}>Views</Text>
                    </View>
                    <Text style={styles.metricGridValue}>
                      {creatorAnalytics.metrics?.views?.toLocaleString() || 0}
                    </Text>
                  </View>

                  <View style={styles.metricGridCard}>
                    <View style={styles.metricGridHeader}>
                      <Clock size={16} color={Colors.primaryAccent} />
                      <Text style={styles.metricGridTitle}>Watch Time</Text>
                    </View>
                    <Text style={styles.metricGridValue}>
                      {creatorAnalytics.metrics?.watchTimeMinutes ? `${creatorAnalytics.metrics.watchTimeMinutes}m` : '0m'}
                    </Text>
                  </View>

                  <View style={styles.metricGridCard}>
                    <View style={styles.metricGridHeader}>
                      <Target size={16} color={Colors.success} />
                      <Text style={styles.metricGridTitle}>Side Joins</Text>
                    </View>
                    <Text style={styles.metricGridValue}>
                      {creatorAnalytics.metrics?.sideJoins?.toLocaleString() || 0}
                    </Text>
                  </View>

                  <View style={styles.metricGridCard}>
                    <View style={styles.metricGridHeader}>
                      <MessageSquare size={16} color={Colors.warning} />
                      <Text style={styles.metricGridTitle}>Comments</Text>
                    </View>
                    <Text style={styles.metricGridValue}>
                      {creatorAnalytics.metrics?.commentsCount?.toLocaleString() || 0}
                    </Text>
                  </View>

                  <View style={styles.metricGridCard}>
                    <View style={styles.metricGridHeader}>
                      <Repeat size={16} color={Colors.primary} />
                      <Text style={styles.metricGridTitle}>Shares</Text>
                    </View>
                    <Text style={styles.metricGridValue}>
                      {creatorAnalytics.metrics?.sharesCount?.toLocaleString() || 0}
                    </Text>
                  </View>
                </View>

                {/* Follower Growth Sparkline Visualization */}
                <Text style={styles.sectionHeading}>Follower Growth Trend</Text>
                <View style={styles.growthChartContainer}>
                  <Text style={styles.growthChartTitle}>Daily Growth (Last 7 Days)</Text>
                  <View style={styles.chartBarsRow}>
                    {creatorAnalytics.followerGrowthTrend?.map((val: number, index: number) => {
                      const maxVal = Math.max(...(creatorAnalytics.followerGrowthTrend || [1]), 1);
                      const barHeight = (val / maxVal) * 60; // scale to max 60px
                      return (
                        <View key={index} style={styles.chartBarContainer}>
                          <View style={[styles.chartBarFill, { height: Math.max(barHeight, 4) }]} />
                          <Text style={styles.chartBarLabel}>D{index + 1}</Text>
                          <Text style={styles.chartBarValue}>+{val}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Dynamic Badges Generated by Behavior */}
                <Text style={styles.sectionHeading}>Behavioral Badges</Text>
                <View style={styles.badgesExplanationContainer}>
                  <View style={styles.badgeItemCard}>
                    <View style={styles.badgeItemHeader}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>🏏</Text>
                      <Text style={styles.badgeItemName}>Cricket Analyst</Text>
                      <View style={styles.badgeTierBadge}>
                        <Text style={styles.badgeTierText}>Top 5%</Text>
                      </View>
                    </View>
                    <Text style={styles.badgeItemDescription}>
                      Automatically unlocked for high accuracy side participation and discussion depth in Cricket Community debates.
                    </Text>
                  </View>

                  <View style={styles.badgeItemCard}>
                    <View style={styles.badgeItemHeader}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>💻</Text>
                      <Text style={styles.badgeItemName}>Tech Explorer</Text>
                      <View style={[styles.badgeTierBadge, { backgroundColor: 'rgba(217, 70, 239, 0.15)' }]}>
                        <Text style={[styles.badgeTierText, { color: Colors.primaryAccent }]}>Top 10%</Text>
                      </View>
                    </View>
                    <Text style={styles.badgeItemDescription}>
                      Unlocked by following core technology topics and contributing to side discussions on Apple and Artificial Intelligence.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={{ color: Colors.textSecondary }}>No data found.</Text>
              </View>
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
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  navTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  logoutBtn: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  gridContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarLargePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 16,
  },
  statCell: {
    alignItems: 'center',
  },
  statNumber: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  infoContainer: {
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  usernameText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  bioText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  editProfileButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabsWrapper: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 6,
  },
  tabBar: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    margin: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridVideoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  // V2 tab contents
  tabContentBlock: {
    marginTop: 16,
    paddingTop: 8,
  },
  sectionHeading: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 70, 239, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 239, 0.2)',
    padding: 12,
    marginBottom: 16,
  },
  streakIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTextMeta: {
    marginLeft: 12,
    flex: 1,
  },
  streakTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  streakDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  overviewSection: {
    marginBottom: 18,
  },
  communityRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commAvatarItem: {
    fontSize: 20,
    marginRight: 10,
  },
  commMetaItem: {
    flex: 1,
  },
  commNameItem: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  commRankItem: {
    fontSize: 10,
    color: Colors.primaryAccent,
    fontWeight: '600',
  },
  emptyTextItem: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  // Communities tab
  communityGridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gridCardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  gridCardMeta: {
    flex: 1,
  },
  gridCardName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  gridCardBadge: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '700',
    marginTop: 2,
  },
  // Edit Profile Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    backgroundColor: '#0F172A', // Premium Dark
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
    backgroundColor: '#1E293B',
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPreview: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPreviewPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPreviewPlaceholderText: {
    fontSize: 24,
    color: Colors.textMuted,
    fontWeight: 'bold',
  },
  avatarPreviewLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '600',
    marginBottom: 6,
  },
  uploadBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  uploadBtnText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetCard: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  presetImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  form: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionDivider: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 12,
  },
  bioInput: {
    height: 60,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#1E293B',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  verifBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  verifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  topicMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  topicMiniChipText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  dashboardProfileHeader: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dashboardProfileInfo: {
    marginBottom: 4,
  },
  dashboardProfileName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  dashboardProfileHandle: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  scoresContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressRow: {
    marginBottom: 12,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressValue: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricGridCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricGridTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  metricGridValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  growthChartContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  growthChartTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    paddingBottom: 4,
  },
  chartBarContainer: {
    alignItems: 'center',
    width: '12%',
  },
  chartBarFill: {
    width: '60%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '600',
    marginTop: 4,
  },
  chartBarValue: {
    color: Colors.textPrimary,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  badgesExplanationContainer: {
    marginBottom: 10,
  },
  badgeItemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeItemName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  badgeTierBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeTierText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '800',
  },
  badgeItemDescription: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
});
