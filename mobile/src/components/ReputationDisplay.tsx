import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Award, Target, Trophy, Film, Cpu, Zap } from 'lucide-react-native';
import { Colors } from '../theme/colors';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface ReputationDisplayProps {
  reputation: number;
  accuracy: number;
  badges: Badge[];
}

export const ReputationDisplay: React.FC<ReputationDisplayProps> = ({ reputation, accuracy, badges }) => {
  const getBadgeIcon = (iconName: string, category: string) => {
    const size = 18;
    const color = Colors.primary;
    switch (iconName.toLowerCase()) {
      case 'trophy':
        return <Trophy size={size} color={Colors.warning} />;
      case 'film':
        return <Film size={size} color="#EC4899" />; // Pink accent for movies
      case 'cpu':
        return <Cpu size={size} color="#06B6D4" />; // Cyan accent for tech
      default:
        return <Award size={size} color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={styles.iconCircle}>
            <Award size={22} color={Colors.warning} />
          </View>
          <Text style={styles.statVal}>{reputation}</Text>
          <Text style={styles.statLabel}>Reputation Score</Text>
        </View>

        <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}>
            <Target size={22} color={Colors.success} />
          </View>
          <Text style={styles.statVal}>{accuracy.toFixed(1)}%</Text>
          <Text style={styles.statLabel}>Prediction Accuracy</Text>
        </View>
      </View>

      {/* Badges Earned Section */}
      <View style={styles.badgesSection}>
        <Text style={styles.sectionTitle}>Badges & Achievements ({badges.length})</Text>
        {badges.length === 0 ? (
          <View style={styles.emptyBadges}>
            <Zap size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.emptyText}>Predict correctly and contribute to earn expert badges!</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesList}>
            {badges.map((badge) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={styles.badgeIconContainer}>
                  {getBadgeIcon(badge.icon, badge.category)}
                </View>
                <Text style={styles.badgeName} numberOfLines={1}>
                  {badge.name}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {badge.description}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
    // Shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statVal: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  badgesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  badgesList: {
    paddingRight: 16,
  },
  badgeItem: {
    width: 96,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  badgeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeName: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDesc: {
    color: Colors.textMuted,
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 10,
  },
  emptyBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
});
