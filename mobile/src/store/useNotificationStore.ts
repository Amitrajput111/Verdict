import { create } from 'zustand';

export type NotificationType = 'side_losing' | 'reply' | 'daily_debate' | 'streak_reminder' | 'badge_earned';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  debateId?: string;
  createdAt: string;
  isRead: boolean;
}

interface NotificationState {
  notifications: InAppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string; createdAt?: string; debateId?: string }) => void;
  markAllRead: () => void;
  markOneRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) => set((state) => {
    const newNotification: InAppNotification = {
      id: n.id || Math.random().toString(36).substring(7),
      type: n.type,
      title: n.title,
      body: n.body,
      debateId: n.debateId,
      createdAt: n.createdAt || new Date().toISOString(),
      isRead: false,
    };
    const updated = [newNotification, ...state.notifications].slice(0, 50);
    return {
      notifications: updated,
      unreadCount: updated.filter((item) => !item.isRead).length,
    };
  }),
  markAllRead: () => set((state) => {
    const updated = state.notifications.map((n) => ({ ...n, isRead: true }));
    return {
      notifications: updated,
      unreadCount: 0,
    };
  }),
  markOneRead: (id) => set((state) => {
    const updated = state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n);
    return {
      notifications: updated,
      unreadCount: updated.filter((item) => !item.isRead).length,
    };
  }),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
