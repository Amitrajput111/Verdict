import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationStore, InAppNotification } from '../store/useNotificationStore';

// Configure notification behavior for native platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
  });
}

export async function scheduleStreakReminder(hour: number): Promise<void> {
  if (Platform.OS === 'web') {
    console.log(`[Push Notification Mocked] Scheduled streak reminder for ${hour}:00`);
    return;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync() as any;
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync() as any;
      if (newStatus !== 'granted') return;
    }

    await cancelStreakReminders();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Keep your streak active!',
        body: "Don't break your participation streak! Vote on today's debates now.",
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      } as any,
    });
  } catch (error) {
    console.error('Failed to schedule streak reminder:', error);
  }
}

export async function cancelStreakReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel notifications:', error);
  }
}

export function addInAppNotification(notification: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'> & { debateId?: string }): void {
  useNotificationStore.getState().addNotification(notification);
}
