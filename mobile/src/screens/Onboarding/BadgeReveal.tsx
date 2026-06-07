import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Colors } from '../../theme/colors';
import { useOnboardingStore } from '../../store/useOnboardingStore';

const INTEREST_BADGES: { [key: string]: { label: string; icon: string } } = {
  cricket: { label: 'Cricket Analyst in Training', icon: '🏏' },
  movies: { label: 'Movie Critic in Training', icon: '🎬' },
  technology: { label: 'Tech Explorer in Training', icon: '🖥️' },
  politics: { label: 'Political Analyst in Training', icon: '🗳️' },
  music: { label: 'Music Critic in Training', icon: '🎵' },
  sports: { label: 'Sports Analyst in Training', icon: '⚽' }
};

interface BadgeRevealProps {
  navigation: any;
}

export const BadgeReveal: React.FC<BadgeRevealProps> = ({ navigation }) => {
  console.log('[BadgeReveal] Screen mounted.');
  const interests = useOnboardingStore((state) => state.interests);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);

  // Safe safeguard: Ensure interests is an array and not null/undefined
  const safeInterests = Array.isArray(interests) ? interests : [];
  const firstInterest = safeInterests[0] || 'cricket';
  const badge = INTEREST_BADGES[firstInterest] || INTEREST_BADGES['cricket'];

  console.log('[BadgeReveal] Loaded badge for interest:', firstInterest);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[BadgeReveal] Starting entrance animations.');
    if (Platform.OS === 'web') {
      // Standard safe timing animation on Web to avoid spring driver exceptions
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false
        })
      ]).start(() => {
        console.log('[BadgeReveal] Animations completed on web.');
      });
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      ]).start(() => {
        console.log('[BadgeReveal] Animations completed on native.');
      });
    }
  }, []);

  const handleFinish = () => {
    console.log('[BadgeReveal] Complete onboarding pressed.');
    completeOnboarding();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your badge is ready!</Text>
        <Text style={styles.subtitle}>
          Based on your interest, this is your starting Verdict role:
        </Text>

        <Animated.View
          style={[
            styles.badgeCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.badgeIcon}>{badge.icon}</Text>
          <Text style={styles.badgeName}>{badge.label}</Text>
          <View style={styles.tierTag}>
            <Text style={styles.tierTagText}>Rank: Novice</Text>
          </View>
        </Animated.View>

        <Text style={styles.streakLabel}>Your streak starts today 🔥</Text>
        <Text style={styles.streakDesc}>Come back tomorrow to keep it active and level up your role.</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} onPress={handleFinish}>
          <Text style={styles.ctaText}>Enter Verdict →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  badgeCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 40,
  },
  badgeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  badgeName: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  tierTag: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierTagText: {
    color: Colors.primaryAccent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  streakLabel: {
    color: Colors.warning,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  streakDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 24,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
