import { getDB } from '@/database';
import type { Friend, ContactLog, Reminder } from '@/types/friend';

export const friendService = {
  /**
   * 获取所有朋友
   */
  async getAllFriends(): Promise<Friend[]> {
    const db = await getDB();
    const friends = await db.getAll('friends');
    return friends.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  /**
   * 根据ID获取朋友
   */
  async getFriendById(id: string): Promise<Friend | undefined> {
    const db = await getDB();
    return db.get('friends', id);
  },

  /**
   * 搜索朋友
   */
  async searchFriends(query: string): Promise<Friend[]> {
    const allFriends = await this.getAllFriends();
    const lowerQuery = query.toLowerCase();
    return allFriends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(lowerQuery) ||
        (friend.nickname && friend.nickname.toLowerCase().includes(lowerQuery)) ||
        friend.relationship.toLowerCase().includes(lowerQuery) ||
        friend.preferences.some((p) => p.toLowerCase().includes(lowerQuery)) ||
        friend.notes.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * 创建朋友
   */
  async createFriend(friend: Partial<Friend>): Promise<Friend> {
    const db = await getDB();
    const now = new Date().toISOString();
    // 转换为普通对象，避免 Proxy 问题
    const plainFriend = JSON.parse(JSON.stringify(friend));
    const newFriend: Friend = {
      id: plainFriend.id || crypto.randomUUID(),
      name: plainFriend.name || '',
      nickname: plainFriend.nickname || '',
      relationship: plainFriend.relationship || '',
      birthday: plainFriend.birthday,
      avatarColor: plainFriend.avatarColor || 'coral',
      lastContactDate: plainFriend.lastContactDate,
      isImportant: plainFriend.isImportant || false,
      preferences: plainFriend.preferences || [],
      notes: plainFriend.notes || '',
      customFields: plainFriend.customFields || [],
      createdAt: now,
      updatedAt: now,
      contactCount: plainFriend.contactCount || 0,
    };
    await db.add('friends', newFriend);
    return newFriend;
  },

  /**
   * 更新朋友
   */
  async updateFriend(id: string, updates: Partial<Friend>): Promise<Friend | undefined> {
    const db = await getDB();
    const friend = await db.get('friends', id);
    if (!friend) return undefined;

    // 转换为普通对象
    const plainUpdates = JSON.parse(JSON.stringify(updates));

    const updatedFriend: Friend = {
      ...friend,
      ...plainUpdates,
      id,
      updatedAt: new Date().toISOString(),
    };
    await db.put('friends', updatedFriend);
    return updatedFriend;
  },

  /**
   * 删除朋友
   */
  async deleteFriend(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('friends', id);
    // 同时删除相关的提醒和联系记录
    const reminders = await db.getAllFromIndex('reminders', 'by-friendId', id);
    for (const reminder of reminders) {
      await db.delete('reminders', reminder.id);
    }
    const logs = await db.getAllFromIndex('contactLogs', 'by-friendId', id);
    for (const log of logs) {
      await db.delete('contactLogs', log.id);
    }
  },

  /**
   * 记录联系
   */
  async addContactLog(log: Omit<ContactLog, 'id' | 'date'>): Promise<ContactLog> {
    const db = await getDB();
    const newLog: ContactLog = {
      ...log,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    await db.add('contactLogs', newLog);

    // 更新朋友的最后联系时间
    await this.updateFriend(log.friendId, {
      lastContactDate: newLog.date,
      contactCount: (await this.getFriendById(log.friendId))?.contactCount ?? 0 + 1,
    });

    return newLog;
  },

  /**
   * 获取朋友的联系记录
   */
  async getContactLogs(friendId: string): Promise<ContactLog[]> {
    const db = await getDB();
    const logs = await db.getAllFromIndex('contactLogs', 'by-friendId', friendId);
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  /**
   * 获取所有提醒
   */
  async getAllReminders(): Promise<Reminder[]> {
    const db = await getDB();
    return db.getAll('reminders');
  },

  /**
   * 创建提醒
   */
  async createReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
    const db = await getDB();
    const newReminder: Reminder = {
      ...reminder,
      id: crypto.randomUUID(),
    };
    await db.add('reminders', newReminder);
    return newReminder;
  },

  /**
   * 更新提醒
   */
  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | undefined> {
    const db = await getDB();
    const reminder = await db.get('reminders', id);
    if (!reminder) return undefined;

    const updated = { ...reminder, ...updates, id };
    await db.put('reminders', updated);
    return updated;
  },

  /**
   * 删除提醒
   */
  async deleteReminder(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('reminders', id);
  },
};
