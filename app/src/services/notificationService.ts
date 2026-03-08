import type { Friend } from '@/types/friend';
import { getDaysUntilBirthday } from '@/utils/dateHelpers';

export interface Notification {
  id: string;
  type: 'birthday' | 'info';
  title: string;
  message: string;
  friendId?: string;
  date: string;
}

export const notificationService = {
  checkNotifications(
    friends: Friend[],
    settings: {
      birthdayReminder: { enabled: boolean; daysBefore: number };
    },
  ): Notification[] {
    const notifications: Notification[] = [];

    for (const friend of friends) {
      if (!settings.birthdayReminder.enabled || !friend.birthday) {
        continue;
      }

      const daysUntil = getDaysUntilBirthday(friend.birthday);

      if (daysUntil === 0) {
        notifications.push({
          id: `birthday-${friend.id}`,
          type: 'birthday',
          title: `今天是 ${friend.name} 的生日`,
          message: '别忘了送上祝福。',
          friendId: friend.id,
          date: new Date().toISOString(),
        });
        continue;
      }

      if (Number.isFinite(daysUntil) && daysUntil > 0 && daysUntil <= settings.birthdayReminder.daysBefore) {
        notifications.push({
          id: `birthday-${friend.id}`,
          type: 'birthday',
          title: `${friend.name} 的生日快到了`,
          message: `还有 ${daysUntil} 天，可以提前准备祝福或礼物。`,
          friendId: friend.id,
          date: new Date().toISOString(),
        });
      }
    }

    return notifications.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  },

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  sendBrowserNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },
};

