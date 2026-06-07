import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { PostCard, PostData } from '../components/PostCard';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

interface DebateScreenProps {
  route: {
    params: {
      postId: string;
    };
  };
  navigation: any;
}

export const DebateScreen: React.FC<any> = ({ route, navigation }) => {
  const { postId } = route.params;
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchDebateDetails = async () => {
    try {
      const postData = await api.get(`/posts/${postId}`);
      setPost(postData);
      const commentsData = await api.get(`/comments/${postId}`);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching debate details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebateDetails();
  }, [postId]);

  const handleAddComment = async () => {
    if (!newCommentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const freshComment = await api.post('/comments', {
        postId,
        content: newCommentText.trim()
      });
      setComments((prev) => [...prev, freshComment]);
      setNewCommentText('');
      if (post) {
        setPost({ ...post, comment_count: post.comment_count + 1 });
      }
    } catch (error) {
      alert('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Debate not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debate Thread</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PostCard post={post} onVoteSuccess={fetchDebateDetails} />

        <Text style={styles.commentsHeading}>Comments ({comments.length})</Text>

        {comments.length === 0 ? (
          <Text style={styles.emptyComments}>No comments yet. Be the first to share your thoughts!</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              {comment.author_avatar ? (
                <Image source={{ uri: comment.author_avatar }} style={styles.commentAvatar} />
              ) : (
                <View style={styles.commentAvatarPlaceholder}>
                  <Text style={styles.commentAvatarText}>
                    {comment.author_username[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.commentMeta}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.author_name}</Text>
                  <Text style={styles.commentUsername}>@{comment.author_username}</Text>
                </View>
                <Text style={styles.commentText}>{comment.content}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Input box */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Share your perspective..."
          placeholderTextColor={Colors.textMuted}
          value={newCommentText}
          onChangeText={setNewCommentText}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !newCommentText.trim() && { opacity: 0.5 }]} 
          onPress={handleAddComment}
          disabled={!newCommentText.trim()}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  commentsHeading: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyComments: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  commentCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentMeta: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  commentUsername: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  commentText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    color: Colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
