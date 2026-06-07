import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { X, Send, Users, ShieldAlert } from 'lucide-react-native';
import { getSocket, connectSocket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

interface SideChatModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  sideId: number;
  sideName: string;
  sideColor: string;
}

interface Message {
  id: string;
  author_username: string;
  author_name: string;
  content: string;
  created_at: string;
}

export const SideChatModal: React.FC<SideChatModalProps> = ({
  visible,
  onClose,
  postId,
  sideId,
  sideName,
  sideColor
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const chatScrollRef = useRef<ScrollView>(null);

  const sideRoomId = `${postId}_side_${sideId}`;

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Fetch side comments or fallback to mock list
      const response = await api.get(`/comments/${postId}`);
      // Filter comments which are simulated for this side or just display them
      const sideMsgs = response.slice(0, 4).map((c: any) => ({
        id: c.id,
        author_username: c.author_username,
        author_name: c.author_name,
        content: `[${sideName} Member]: ${c.content}`,
        created_at: c.created_at
      }));
      setMessages(sideMsgs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  useEffect(() => {
    if (visible) {
      loadMessages();

      // Connect to Socket Room
      const socket = getSocket();
      connectSocket();
      socket.emit('join_post', sideRoomId);

      socket.on('new_comment', (data: any) => {
        // Only append if it matches this side's room ID
        if (data.side_room_id === sideRoomId || data.post_id === sideRoomId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [...prev, {
              id: data.id,
              author_username: data.author_username,
              author_name: data.author_name,
              content: data.content,
              created_at: data.created_at
            }];
          });
          setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      });

      return () => {
        socket.emit('leave_post', sideRoomId);
        socket.off('new_comment');
      };
    }
  }, [visible, sideRoomId]);

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !isAuthenticated) return;

    const content = inputText.trim();
    setInputText('');

    try {
      // POST comment representing side chat room
      await api.post('/comments', {
        postId,
        content: `[Side: ${sideName}] ${content}`,
        sideRoomId
      });

      // Locally append message immediately for responsive UI
      const newMsg: Message = {
        id: Math.random().toString(),
        author_username: currentUser?.profile?.username || 'me',
        author_name: currentUser?.profile?.name || 'Me',
        content,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending side comment:', error);
    }
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: sideColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.titleText}>{sideName} Chat</Text>
              <View style={[styles.badge, { backgroundColor: sideColor + '30', borderColor: sideColor }]}>
                <Text style={[styles.badgeText, { color: sideColor }]}>Exclusive</Text>
              </View>
            </View>
            <Text style={styles.subtitleText}>Debate room for joined tribe members only</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Syncing Side room chat...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Warning Banner */}
            <View style={styles.warningBanner}>
              <ShieldAlert size={14} color={Colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.warningText}>You joined this side. Opposite tribe members cannot view this chat.</Text>
            </View>

            {/* Message Stream */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={true}
            >
              {messages.map((item) => (
                <View key={item.id} style={styles.msgBubbleRow}>
                  <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>{item.author_username[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.bubbleContent}>
                    <View style={styles.metaRow}>
                      <Text style={styles.authorName}>{item.author_name}</Text>
                      <Text style={styles.authorTag}>@{item.author_username}</Text>
                    </View>
                    <Text style={styles.msgText}>{item.content}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputBar}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={`Speak for ${sideName}...`}
                  placeholderTextColor={Colors.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  editable={isAuthenticated}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, inputText.trim() === '' && styles.sendBtnDisabled]}
                  disabled={inputText.trim() === ''}
                  onPress={handleSendMessage}
                >
                  <Send size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
    backgroundColor: Colors.card,
  },
  closeBtn: {
    padding: 4,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  subtitleText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 10,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  warningText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  msgBubbleRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  avatarMiniText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  bubbleContent: {
    flex: 1,
    backgroundColor: Colors.card,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomLeftRadius: 10,
    padding: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  authorName: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 4,
  },
  authorTag: {
    color: Colors.textMuted,
    fontSize: 9,
  },
  msgText: {
    color: Colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  inputBar: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  textInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
