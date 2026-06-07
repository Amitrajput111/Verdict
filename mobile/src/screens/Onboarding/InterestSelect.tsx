import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { useOnboardingStore } from '../../store/useOnboardingStore';

const INTERESTS = [
  { id: 'cricket', name: 'Cricket', emoji: '🏏' },
  { id: 'movies', name: 'Movies', emoji: '🎬' },
  { id: 'technology', name: 'Tech', emoji: '🖥️' },
  { id: 'politics', name: 'Politics', emoji: '🗳️' },
  { id: 'music', name: 'Music', emoji: '🎵' },
  { id: 'sports', name: 'Sports', emoji: '⚽' }
];

interface InterestSelectProps {
  navigation: any;
}

export const InterestSelect: React.FC<InterestSelectProps> = ({ navigation }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const setInterests = useOnboardingStore((state) => state.setInterests);

  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      if (selected.length < 3) {
        setSelected([...selected, id]);
      }
    }
  };

  const handleContinue = () => {
    if (selected.length >= 1) {
      setInterests(selected);
      navigation.navigate('FirstDebate');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>What are you into?</Text>
        <Text style={styles.subtitle}>
          Select at least 1 topic, up to 3, to personalize your Verdict feed.
        </Text>

        <View style={styles.grid}>
          {INTERESTS.map((interest) => {
            const isSelected = selected.includes(interest.id);
            return (
              <TouchableOpacity
                key={interest.id}
                style={[
                  styles.tile,
                  isSelected && styles.tileSelected
                ]}
                onPress={() => handleToggle(interest.id)}
              >
                <Text style={styles.emoji}>{interest.emoji}</Text>
                <Text style={styles.tileName}>{interest.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.cta,
            selected.length === 0 && styles.ctaDisabled
          ]}
          disabled={selected.length === 0}
          onPress={handleContinue}
        >
          <Text style={styles.ctaText}>Continue →</Text>
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
  scroll: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
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
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  tile: {
    width: '47%',
    aspectRatio: 1.1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
  },
  tileSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  tileName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
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
  ctaDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
