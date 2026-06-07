import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useOnboardingStore } from '../../store/useOnboardingStore';

interface Option {
  id: number;
  text: string;
}

interface DebateData {
  id: string;
  title: string;
  content: string;
  type: string;
  options?: Option[];
  vote_count: number;
}

interface FirstDebateProps {
  navigation: any;
}

export const FirstDebate: React.FC<FirstDebateProps> = ({ navigation }) => {
  console.log('[FirstDebate] Screen mounted.');
  const interests = useOnboardingStore((state) => state.interests);
  const setFirstVotedDebate = useOnboardingStore((state) => state.setFirstVotedDebate);

  const [loading, setLoading] = useState(true);
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [stats, setStats] = useState<{ optionId: number; percentage: number }[]>([]);

  const widthAnims = React.useRef<{ [key: number]: Animated.Value }>({}).current;

  // Safe safeguard: Ensure interests is an array and not null/undefined
  const safeInterests = Array.isArray(interests) ? interests : [];
  const firstInterest = safeInterests[0] || 'cricket';

  useEffect(() => {
    const fetchDebate = async () => {
      setLoading(true);
      try {
        const data = await api.get(`/api/debates/top?interest=${firstInterest}`);
        setDebate(data);
        if (data.options) {
          data.options.forEach((opt: Option) => {
            widthAnims[opt.id] = new Animated.Value(0);
          });
        }
      } catch (err) {
        console.error('Error fetching onboarding debate:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDebate();
  }, [firstInterest]);

  const handleVote = async (optionId: number) => {
    if (!debate || voted || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.post(`/votes/${debate.id}`, { selectedOptionId: optionId });
      setSelectedOptionId(optionId);
      setFirstVotedDebate(debate.id);
      setVoted(true);

      // Simulate percentage update (e.g. 58% vs 42% or similar)
      const isOptionZero = optionId === 0;
      const optionZeroPercent = isOptionZero ? 62 : 38;
      const optionOnePercent = 100 - optionZeroPercent;

      const results = [
        { optionId: 0, percentage: optionZeroPercent },
        { optionId: 1, percentage: optionOnePercent }
      ];
      setStats(results);

      // Trigger animations
      results.forEach((item) => {
        if (widthAnims[item.optionId]) {
          Animated.timing(widthAnims[item.optionId], {
            toValue: item.percentage,
            duration: 800,
            useNativeDriver: false
          }).start();
        }
      });
    } catch (err) {
      console.error('Failed to submit onboarding vote:', err);
      // Fallback local mock simulation on error
      setSelectedOptionId(optionId);
      setFirstVotedDebate(debate.id);
      setVoted(true);
      const results = [
        { optionId: 0, percentage: optionId === 0 ? 60 : 40 },
        { optionId: 1, percentage: optionId === 1 ? 60 : 40 }
      ];
      setStats(results);
      results.forEach((item) => {
        if (widthAnims[item.optionId]) {
          Animated.timing(widthAnims[item.optionId], {
            toValue: item.percentage,
            duration: 800,
            useNativeDriver: false
          }).start();
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    console.log('[FirstDebate] Navigating to BadgeReveal screen.');
    navigation.navigate('BadgeReveal');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching trending debates...</Text>
      </View>
    );
  }

  if (!debate) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <Text style={styles.title}>Error Loading Debate</Text>
        <Text style={styles.subtitle}>Please proceed to get your custom badge.</Text>
        <TouchableOpacity style={styles.cta} onPress={handleNext}>
          <Text style={styles.ctaText}>Proceed →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headerTitle}>First Debate</Text>
        <Text style={styles.headerSubtitle}>
          Verdict is a Participation Network. Join a side to voice your opinion!
        </Text>

        <View style={styles.debateCard}>
          <Text style={styles.interestTag}>🔥 Trending in #{firstInterest.toUpperCase()}</Text>
          <Text style={styles.debateTitle}>{debate.title}</Text>
          <Text style={styles.debateDesc}>{debate.content}</Text>

          <View style={styles.optionsWrapper}>
            {debate.options?.map((option, idx) => {
              const isSelected = selectedOptionId === option.id;
              const sideColor = idx === 0 ? '#10B981' : '#EF4444'; // Green vs Red
              const stat = stats.find((s) => s.optionId === option.id);
              const percentText = stat ? `${stat.percentage}%` : '';

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionBtn,
                    voted && styles.optionBtnDisabled,
                    isSelected && { borderColor: sideColor }
                  ]}
                  disabled={voted}
                  onPress={() => handleVote(option.id)}
                >
                  {voted && (
                    <Animated.View
                      style={[
                        styles.percentageBar,
                        {
                          backgroundColor: sideColor + '20',
                          width: widthAnims[option.id] ? widthAnims[option.id].interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                          }) : '0%'
                        }
                      ]}
                    />
                  )}

                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>{option.text}</Text>
                    {voted && <Text style={[styles.percentLabel, { color: sideColor }]}>{percentText}</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {voted && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={handleNext}>
            <Text style={styles.ctaText}>See my badge →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  debateCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  interestTag: {
    color: Colors.primaryAccent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  debateTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 8,
  },
  debateDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 24,
  },
  optionsWrapper: {
    width: '100%',
  },
  optionBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 12,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  optionBtnDisabled: {
    borderColor: Colors.border,
  },
  percentageBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  optionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  percentLabel: {
    fontSize: 14,
    fontWeight: '800',
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
  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
});
