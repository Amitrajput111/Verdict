import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, Trash2, Image as ImageIcon, Film, BarChart2, MessageSquare, HelpCircle, Clipboard } from 'lucide-react-native';

interface Community {
  id: string;
  name: string;
  slug: string;
}

const MEDIA_PRESETS = [
  { id: 'cricket', label: '🏏 Cricket Stadium', url: 'https://images.unsplash.com/photo-1531415080290-bc9854503f37?w=800', type: 'image' },
  { id: 'gaming', label: '🎮 Cyberpunk Setup', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', type: 'image' },
  { id: 'tech', label: '💻 AI Artificial Intelligence', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800', type: 'image' },
  { id: 'movie', label: '🎬 Movie Cinema', url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', type: 'image' },
  { id: 'finance', label: '📈 Trading App (Video)', url: 'https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-smartphone-with-a-financial-app-41584-large.mp4', type: 'video' },
  { id: 'gamer_clip', label: '👾 FPS Game Play (Video)', url: 'https://assets.mixkit.co/videos/preview/mixkit-man-playing-a-first-person-shooter-video-game-40092-large.mp4', type: 'video' },
  { id: 'nature', label: '🌲 River Sunlight (Video)', url: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4', type: 'video' }
];

export const CreateScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'image' | 'video' | 'poll' | 'prediction' | 'debate'>('text');
  
  const [options, setOptions] = useState<string[]>(['', '']);
  const [mediaUrl, setMediaUrl] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const fetchCommunities = async () => {
      setLoadingCommunities(true);
      try {
        const commData = await api.get('/communities');
        setCommunities(commData);
        if (commData.length > 0) {
          setSelectedCommunityId(commData[0].id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingCommunities(false);
      }
    };

    fetchCommunities();
  }, []);

  useEffect(() => {
    if (type === 'debate') {
      setOptions(['Agree', 'Disagree']);
    } else if (type === 'prediction' || type === 'poll') {
      setOptions(['Yes', 'No']);
    } else {
      setOptions(['', '']);
    }

    // Auto seed media type URLs if type is selected
    if (type === 'image') {
      setMediaUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'); // Default to gaming
    } else if (type === 'video') {
      setMediaUrl('https://assets.mixkit.co/videos/preview/mixkit-man-playing-a-first-person-shooter-video-game-40092-large.mp4'); // Default to gaming video
    } else {
      setMediaUrl('');
    }
  }, [type]);

  const handleAddOption = () => {
    if (options.length >= 6) {
      Alert.alert('Limit Reached', 'You can have a maximum of 6 options.');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert('Required', 'You must have at least 2 options.');
      return;
    }
    const nextOpts = [...options];
    nextOpts.splice(index, 1);
    setOptions(nextOpts);
  };

  const handleOptionChange = (text: string, index: number) => {
    const nextOpts = [...options];
    nextOpts[index] = text;
    setOptions(nextOpts);
  };

  const handleSelectPreset = (url: string, presetType: string) => {
    setMediaUrl(url);
    if (presetType === 'video' && type !== 'video') {
      setType('video');
    } else if (presetType === 'image' && type === 'text') {
      setType('image');
    }
  };

  const handleChooseDeviceFile = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          setMediaUrl(reader.result as string); // base64 representation
          if (file.type.startsWith('video/')) {
            setType('video');
          } else {
            setType('image');
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      Alert.alert('Browser Only', 'Device uploading is optimized for the web browser. Please enter a URL on native screens.');
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'You must be logged in to create posts.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }

    const isInteractive = ['poll', 'prediction', 'debate'].includes(type);
    let finalOptions: string[] = [];

    if (isInteractive) {
      finalOptions = options.map((o) => o.trim()).filter((o) => o !== '');
      if (finalOptions.length < 2) {
        Alert.alert('Required', 'Please fill in at least 2 options.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        content: content.trim(),
        communityId: selectedCommunityId,
        mediaUrl: mediaUrl.trim() || undefined,
        options: isInteractive ? finalOptions : undefined,
        expiresAt: type === 'prediction' ? new Date(Date.now() + 24 * 60 * 60 * 1000 * 3) : undefined,
      };

      await api.post('/posts', payload);
      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setTitle('');
            setContent('');
            setMediaUrl('');
            setType('text');
            navigation.navigate('Home');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit post');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper placeholders
  const getTitlePlaceholder = () => {
    switch (type) {
      case 'image':
        return 'Describe your image topic... (e.g. My new gaming laptop setup review)';
      case 'video':
        return 'Title for your vertical video clip... (e.g. Crazy last ball six in local tournament)';
      case 'poll':
        return 'What do you want to ask? (e.g. Which team has the best defense in IPL this year?)';
      case 'prediction':
        return 'Define a verifiable prediction... (e.g. Will SpaceX Starship successfully catch both boosters?)';
      case 'debate':
        return 'State your debate topic... (e.g. Should working from home be a fundamental legal right?)';
      default:
        return 'e.g. Will Apple release VR glasses this year?';
    }
  };

  const getExampleLabel = () => {
    switch (type) {
      case 'poll':
        return 'Example: "Favorite console?" (Options: PlayStation 5, Xbox Series X, Nintendo Switch)';
      case 'prediction':
        return 'Example: "Will Bitcoin hit $120,000 by Christmas?" (Options: Yes, No)';
      case 'debate':
        return 'Example: "Social Media makes us lonely." (Options: Agree, Disagree)';
      default:
        return 'Create engaging discussions that invite users to vote and interact.';
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Post</Text>

        {/* Post Type Selector (Instagram Grid Style) */}
        <Text style={styles.sectionLabel}>Select Post Format</Text>
        <View style={styles.typeSelectorRow}>
          {[
            { id: 'text', label: 'Text', icon: Clipboard },
            { id: 'image', label: 'Photo', icon: ImageIcon },
            { id: 'video', label: 'Reel', icon: Film },
            { id: 'poll', label: 'Poll', icon: BarChart2 },
            { id: 'prediction', label: 'Predict', icon: HelpCircle },
            { id: 'debate', label: 'Debate', icon: MessageSquare }
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = type === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeButton, isSelected && styles.typeButtonActive]}
                onPress={() => setType(t.id as any)}
              >
                <Icon size={18} color={isSelected ? '#FFFFFF' : Colors.textSecondary} />
                <Text style={[styles.typeButtonText, isSelected && styles.typeButtonTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Post Forms */}
        <View style={styles.card}>
          <Text style={styles.label}>Title / Question</Text>
          <TextInput
            style={styles.input}
            placeholder={getTitlePlaceholder()}
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Context Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add a detailed description, background context, rules, or references..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            value={content}
            onChangeText={setContent}
          />

          {/* Media Section: Customizable Links and Tap Presets */}
          <View style={styles.mediaLabelRow}>
            <Text style={styles.label}>Media URL (Photo or Video Link)</Text>
            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.uploadDeviceBtn} onPress={handleChooseDeviceFile}>
                <ImageIcon size={11} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.uploadDeviceBtnText}>Upload File</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Paste direct URL to a photo (.jpg/.png) or video (.mp4)"
            placeholderTextColor={Colors.textMuted}
            value={mediaUrl}
            onChangeText={setMediaUrl}
          />

          {/* Thumbnail preview if URL exists */}
          {mediaUrl.trim().length > 10 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Media Preview:</Text>
              {mediaUrl.startsWith('data:video') || mediaUrl.includes('.mp4') || type === 'video' ? (
                <View style={styles.videoPreviewBlock}>
                  <Film size={28} color={Colors.primary} />
                  <Text style={styles.videoPreviewText} numberOfLines={1}>Local Device Video Loaded</Text>
                </View>
              ) : (
                <Image source={{ uri: mediaUrl }} style={styles.previewImage} resizeMode="cover" />
              )}
            </View>
          )}

          {/* Pre-curated high quality presets */}
          <Text style={styles.miniLabel}>Or Tap a Curated Media Preset:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsList}>
            {MEDIA_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetChip,
                  mediaUrl === preset.url && styles.presetChipActive
                ]}
                onPress={() => handleSelectPreset(preset.url, preset.type)}
              >
                <Text style={[styles.presetChipText, mediaUrl === preset.url && styles.presetChipTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dynamic Option Inputs for Poll/Prediction/Debate */}
          {['poll', 'prediction', 'debate'].includes(type) && (
            <View style={styles.optionsBlock}>
              <View style={styles.optionsHeader}>
                <Text style={styles.label}>Prediction Options</Text>
                {type !== 'debate' && (
                  <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddOption}>
                    <Plus size={14} color={Colors.primary} />
                    <Text style={styles.addOptionBtnText}>Add Option</Text>
                  </TouchableOpacity>
                )}
              </View>

              {options.map((opt, idx) => (
                <View key={idx} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder={idx === 0 ? 'e.g. Yes' : idx === 1 ? 'e.g. No' : `Option ${idx + 1}`}
                    placeholderTextColor={Colors.textMuted}
                    value={opt}
                    onChangeText={(text) => handleOptionChange(text, idx)}
                    editable={type !== 'debate'}
                  />
                  {type !== 'debate' && options.length > 2 && (
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveOption(idx)}>
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <Text style={styles.tipText}>{getExampleLabel()}</Text>
            </View>
          )}

          {/* Community Picker Dropdown */}
          <Text style={styles.label}>Community Segment</Text>
          {loadingCommunities ? (
            <ActivityIndicator color={Colors.primary} size="small" style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.communitiesRow}>
              {communities.map((comm) => (
                <TouchableOpacity
                  key={comm.id}
                  style={[
                    styles.commSelectBtn,
                    selectedCommunityId === comm.id && styles.commSelectBtnActive,
                  ]}
                  onPress={() => setSelectedCommunityId(comm.id)}
                >
                  <Text style={[styles.commSelectText, selectedCommunityId === comm.id && styles.commSelectTextActive]}>
                    c/{comm.slug}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Publish to Feed</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 10,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  typeButton: {
    width: '32%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  mediaLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  uploadDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED10',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7C3AED30',
  },
  uploadDeviceBtnText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
  },
  miniLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    color: Colors.textPrimary,
    paddingHorizontal: 14,
    fontSize: 13,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  previewContainer: {
    marginBottom: 12,
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 6,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  videoPreviewBlock: {
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  videoPreviewText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  presetsList: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#7C3AED15',
    borderColor: Colors.primary,
  },
  presetChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  optionsBlock: {
    marginBottom: 12,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addOptionBtnText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeBtn: {
    marginLeft: 12,
    justifyContent: 'center',
    height: 44,
  },
  tipText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  communitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  commSelectBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  commSelectBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#7C3AED10',
  },
  commSelectText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  commSelectTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
