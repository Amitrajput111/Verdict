import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation, navigationRef } from './src/navigation';
import { Platform, View, StyleSheet, Dimensions, Text, TouchableOpacity, Image } from 'react-native';
import { Colors } from './src/theme/colors';
import { useAuthStore } from './src/store/useAuthStore';
import { useOnboardingStore } from './src/store/useOnboardingStore';
import * as Notifications from 'expo-notifications';
import { scheduleStreakReminder, cancelStreakReminders } from './src/services/notifications';
import { useNotificationStore } from './src/store/useNotificationStore';
import { Home, Compass, PlusCircle, Users, User, LogOut, Award, TrendingUp } from 'lucide-react-native';

const SUGGESTED_GROUPS = [
  { slug: 'cricket', name: 'Cricket Predictors', avatar: '🏏', count: '1.2k members' },
  { slug: 'gaming', name: 'Gaming Clan', avatar: '🎮', count: '980 members' },
  { slug: 'technology', name: 'AI Discussions', avatar: '💻', count: '2.4k members' },
];

const TOP_PREDICTORS = [
  { username: 'cricket_guru', name: 'Rahul Sharma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', rep: '250 rep' },
  { username: 'pixel_king', name: 'Alex Mercer', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', rep: '320 rep' },
  { username: 'cinephile', name: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', rep: '180 rep' },
];

export default function App() {
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);

  const [activeTab, setActiveTab] = useState('Home');

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    cancelStreakReminders().then(() => {
      scheduleStreakReminder(20);
    });

    if (Platform.OS !== 'web') {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "🔥 Don't break your streak!",
          body: 'Vote today to keep your daily participation streak alive!',
        },
        trigger: {
          seconds: 60,
        } as any,
      });
    } else {
      const timer = setTimeout(() => {
        useNotificationStore.getState().addNotification({
          type: 'streak_reminder',
          title: "🔥 Don't break your streak!",
          body: 'Vote today to keep your daily participation streak alive!',
        });
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, []);

  const isDesktop = Platform.OS === 'web' && windowWidth >= 800 && hasCompletedOnboarding;

  const handlePressTab = (tabName: string) => {
    setActiveTab(tabName);
    if (navigationRef.isReady()) {
      navigationRef.navigate(tabName);
    }
  };

  const renderLeftSidebar = () => {
    if (!isAuthenticated) return null;
    return (
      <View style={styles.sidebar}>
        {/* Brand Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Verdict</Text>
        </View>

        {/* Navigation Items */}
        <View style={styles.navMenu}>
          {[
            { id: 'Home', label: 'Home', icon: Home },
            { id: 'Explore', label: 'Explore', icon: Compass },
            { id: 'Create', label: 'Create Post', icon: PlusCircle },
            { id: 'Communities', label: 'Groups', icon: Users },
            { id: 'Profile', label: 'Profile', icon: User },
          ].map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.navItem, isSelected && styles.navItemActive]}
                onPress={() => handlePressTab(item.id)}
              >
                <IconComponent size={20} color={isSelected ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.navItemLabel, isSelected && styles.navItemLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.logoutLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRightSidebar = () => {
    if (!isAuthenticated || !user) return null;
    return (
      <View style={styles.rightPanel}>
        {/* Active User Card */}
        <TouchableOpacity 
          style={styles.userCard}
          onPress={() => handlePressTab('Profile')}
        >
          {user.profile.avatar ? (
            <Image source={{ uri: user.profile.avatar }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarPlaceholderText}>
                {user.profile.username[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{user.profile.name}</Text>
            <Text style={styles.userUsername}>@{user.profile.username}</Text>
          </View>
        </TouchableOpacity>

        {/* Suggested Communities */}
        <View style={styles.rightSection}>
          <Text style={styles.sectionTitle}>Suggested Groups</Text>
          {SUGGESTED_GROUPS.map((comm) => (
            <View key={comm.slug} style={styles.suggestionRow}>
              <Text style={styles.commIcon}>{comm.avatar}</Text>
              <View style={styles.commMeta}>
                <Text style={styles.commName}>c/{comm.slug}</Text>
                <Text style={styles.commCount}>{comm.count}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Top Predictors */}
        <View style={styles.rightSection}>
          <View style={styles.sectionHeaderRow}>
            <TrendingUp size={12} color={Colors.warning} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Trending Predictors</Text>
          </View>
          {TOP_PREDICTORS.map((predictor) => (
            <View key={predictor.username} style={styles.predictorRow}>
              <Image source={{ uri: predictor.avatar }} style={styles.predictorAvatar} />
              <View style={styles.predictorMeta}>
                <Text style={styles.predictorName}>{predictor.name}</Text>
                <Text style={styles.predictorUsername}>@{predictor.username}</Text>
              </View>
              <View style={styles.repBadge}>
                <Award size={10} color={Colors.warning} />
                <Text style={styles.repText}>{predictor.rep}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Small Footer copyright info */}
        <Text style={styles.copyrightText}>© 2026 VERDICT SOCIAL INC.</Text>
      </View>
    );
  };

  if (isDesktop) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" translucent />
        <View style={styles.desktopContainer}>
          {renderLeftSidebar()}
          <View style={styles.desktopCenterPanel}>
            <Navigation />
          </View>
          {renderRightSidebar()}
        </View>
      </SafeAreaProvider>
    );
  }

  // Mobile viewport behavior withcentered border bezel
  if (Platform.OS === 'web') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" translucent />
        <View style={styles.webContainer}>
          <View style={styles.appShell}>
            <Navigation />
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" translucent />
      <Navigation />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#0F172A', // dark backdrop
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100vh' as any, // Full screen viewport height on web
  },
  appShell: {
    width: '100%',
    maxWidth: 480, // standardized mobile mockup width
    height: '95%',
    maxHeight: 820,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 6,
    borderColor: '#1E293B', // Phone bezel border (Surface color)
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  // Responsive Desktop Web Styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F172A', // Premium Dark
    width: '100%',
    height: '100vh' as any,
  },
  sidebar: {
    width: 240,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: '#1E293B', // Surface
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    marginBottom: 40,
    marginTop: 10,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  navMenu: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  navItemActive: {
    backgroundColor: '#7C3AED10', // amethyst purple tint
  },
  navItemLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginLeft: 14,
  },
  navItemLabelActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutLabel: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '700',
    marginLeft: 14,
  },
  desktopCenterPanel: {
    flex: 1,
    maxWidth: 600,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.background,
  },
  rightPanel: {
    flex: 1,
    padding: 32,
    backgroundColor: '#0F172A', // Background
    maxWidth: 360,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userMeta: {
    marginLeft: 14,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userUsername: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  rightSection: {
    marginBottom: 26,
    backgroundColor: '#1E293B', // Surface
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  commIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  commMeta: {
    justifyContent: 'center',
  },
  commName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  commCount: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  predictorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  predictorMeta: {
    flex: 1,
  },
  predictorName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  predictorUsername: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  repBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  repText: {
    color: Colors.warning,
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  copyrightText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 0.5,
  },
});
