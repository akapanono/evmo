import type { Friend } from '@/types/friend';
import { isBirthdayToday, getDaysUntilBirthday, needsContactReminder } from '@/utils/date';

export interface Notification {
  id: string;
  type: 'birthday' | 'contact' | 'info';
  title: string;
  message: string;
  friendId?: string;
  date: string;
}

export const notificationService = {
  /**
   * 检查是否有需要通知的事项
   */
  checkNotifications(friends: Friend[], settings: {
    birthdayReminder: { enabled: boolean; daysBefore: number };
    contactReminder: { enabled: boolean; daysThreshold: number };
  }): Notification[] {
    const notifications: Notification[] = [];

    for (const friend of friends) {
      // 生日提醒
      if (settings.birthdayReminder.enabled && friend.birthday) {
        const daysUntil = getDaysUntilBirthday(friend.birthday);
        if (daysUntil === 0) {
          notifications.push({
            id: `birthday-${friend.id}`,
            type: 'birthday',
            title: `今天是 ${friend.name} 的生日！`,
            message: '别忘了送上祝福~',
            friendId: friend.id,
            date: new Date().toISOString(),
          });
        } else if (daysUntil > 0 && daysUntil <= settings.birthdayReminder.daysBefore) {
          notifications.push({
            id: `birthday-${friend.id}`,
            type: 'birthday',
            title: `${friend.name} 的生日快到了`,
            message: `还有 ${daysUntil} 天，提前准备祝福吧`,
            friendId: friend.id,
            date: new Date().toISOString(),
          });
        }
      }

      // 联系提醒
      if (settings.contactReminder.enabled) {
        if (needsContactReminder(friend.lastContactDate, settings.contactReminder.daysThreshold)) {
          const days = friend.lastContactDate
            ? Math.floor((new Date().getTime() - new Date(friend.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
            : '很久';
          notifications.push({
            id: `contact-${friend.id}`,
            type: 'contact',
            title: `和 ${friend.name} 保持联系`,
            message: typeof days === 'number' ? `你们已经 ${days} 天没联系了` : `你们很久没联系了`,
            friendId: friend.id,
            date: new Date().toISOString(),
          });
        }
      }
    }

    return notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  /**
   * 请求浏览器通知权限
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  /**
   * 发送浏览器通知
   */
  sendBrowserNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },
};
