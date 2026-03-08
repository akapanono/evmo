import { getDB } from '@/database';
import type { ContactLog, Friend, Reminder } from '@/types/friend';

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function inferTimeline(value: string): boolean {
  return /最近|近况|这周|本周|今天|明天|后天|下周|月底|下个月|近期|现在|正在|在忙|准备|打算|计划|要|即将|报名|考研|考试|出差|搬家|住院|工作变动/.test(value);
}

function inferSemanticType(label: string, value: string): Friend['customFields'][number]['semanticType'] {
  if (label.includes('禁忌')) return 'restriction';
  if (label.includes('偏好')) return 'preference';
  if (label.includes('近况')) return 'status';
  if (label.includes('事件') || label.includes('阶段')) return 'event';
  if (label.includes('纪念')) return 'milestone';
  return inferTimeline(value) ? 'event' : 'note';
}

function inferTemporalScope(value: string, includeInTimeline: boolean): Friend['customFields'][number]['temporalScope'] {
  return includeInTimeline || inferTimeline(value) ? 'timebound' : 'stable';
}

function normalizeCustomFields(value: Friend['customFields'] | undefined): Friend['customFields'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((field) => field && typeof field.label === 'string' && typeof field.value === 'string')
    .map((field) => {
      const includeInTimeline = typeof field.includeInTimeline === 'boolean'
        ? field.includeInTimeline
        : inferTimeline(field.value);

      return {
        id: field.id || crypto.randomUUID(),
        label: field.label.trim(),
        value: field.value.trim(),
        createdAt: typeof field.createdAt === 'string' && field.createdAt ? field.createdAt : new Date().toISOString(),
        includeInTimeline,
        semanticType: field.semanticType ?? inferSemanticType(field.label, field.value),
        temporalScope: field.temporalScope ?? inferTemporalScope(field.value, includeInTimeline),
        extractionMethod: field.extractionMethod ?? 'rule',
        sourceText: typeof field.sourceText === 'string' && field.sourceText ? field.sourceText : field.value.trim(),
        eventTimeText: typeof field.eventTimeText === 'string' && field.eventTimeText ? field.eventTimeText : undefined,
      };
    });
}

function normalizeFriendInput(friend: Partial<Friend>, existing?: Friend): Friend {
  const now = new Date().toISOString();
  const preferences = Array.isArray(friend.preferences)
    ? friend.preferences.map((item) => String(item).trim()).filter(Boolean)
    : (existing?.preferences ?? []);

  const name = typeof friend.name === 'string'
    ? friend.name.trim()
    : existing?.name ?? '';

  return {
    id: friend.id ?? existing?.id ?? crypto.randomUUID(),
    name,
    nickname: normalizeText(typeof friend.nickname === 'string' ? friend.nickname : existing?.nickname) ?? '',
    relationship: typeof friend.relationship === 'string'
      ? friend.relationship.trim()
      : existing?.relationship ?? '',
    birthday: normalizeText(typeof friend.birthday === 'string' ? friend.birthday : existing?.birthday),
    avatarColor: friend.avatarColor ?? existing?.avatarColor ?? 'coral',
    lastContactDate: normalizeText(typeof friend.lastContactDate === 'string' ? friend.lastContactDate : existing?.lastContactDate),
    isImportant: typeof friend.isImportant === 'boolean' ? friend.isImportant : existing?.isImportant ?? false,
    preferences,
    notes: typeof friend.notes === 'string' ? friend.notes.trim() : existing?.notes ?? '',
    customFields: normalizeCustomFields(friend.customFields ?? existing?.customFields),
    createdAt: existing?.createdAt ?? friend.createdAt ?? now,
    updatedAt: now,
    contactCount: typeof friend.contactCount === 'number' ? friend.contactCount : existing?.contactCount ?? 0,
  };
}

async function normalizeStoredFriend(friend: Friend): Promise<Friend> {
  const normalized = normalizeFriendInput(friend, friend);
  const changed = JSON.stringify(friend) !== JSON.stringify(normalized);

  if (changed) {
    const db = await getDB();
    await db.put('friends', normalized);
  }

  return normalized;
}

export const friendService = {
  async getAllFriends(): Promise<Friend[]> {
    const db = await getDB();
    const friends = await db.getAll('friends');
    const normalizedFriends = await Promise.all(friends.map((friend) => normalizeStoredFriend(friend)));

    return normalizedFriends.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async getFriendById(id: string): Promise<Friend | undefined> {
    const db = await getDB();
    const friend = await db.get('friends', id);
    return friend ? normalizeStoredFriend(friend) : undefined;
  },

  async searchFriends(query: string): Promise<Friend[]> {
    const allFriends = await this.getAllFriends();
    const lowerQuery = query.trim().toLowerCase();

    if (!lowerQuery) {
      return allFriends;
    }

    return allFriends.filter((friend) => {
      const customFieldMatched = friend.customFields.some(
        (field) => field.label.toLowerCase().includes(lowerQuery) || field.value.toLowerCase().includes(lowerQuery),
      );

      return [
        friend.name,
        friend.nickname ?? '',
        friend.relationship,
        friend.notes,
        ...friend.preferences,
      ].some((value) => value.toLowerCase().includes(lowerQuery)) || customFieldMatched;
    });
  },

  async createFriend(friend: Partial<Friend>): Promise<Friend> {
    const db = await getDB();
    const plainFriend = JSON.parse(JSON.stringify(friend)) as Partial<Friend>;
    const newFriend = normalizeFriendInput(plainFriend);
    await db.add('friends', newFriend);
    return newFriend;
  },

  async updateFriend(id: string, updates: Partial<Friend>): Promise<Friend | undefined> {
    const db = await getDB();
    const existing = await this.getFriendById(id);

    if (!existing) {
      return undefined;
    }

    const plainUpdates = JSON.parse(JSON.stringify(updates)) as Partial<Friend>;
    const updatedFriend = normalizeFriendInput({ ...plainUpdates, id }, existing);
    await db.put('friends', updatedFriend);
    return updatedFriend;
  },

  async deleteFriend(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('friends', id);

    const reminders = await db.getAllFromIndex('reminders', 'by-friendId', id);
    for (const reminder of reminders) {
      await db.delete('reminders', reminder.id);
    }

    const logs = await db.getAllFromIndex('contactLogs', 'by-friendId', id);
    for (const log of logs) {
      await db.delete('contactLogs', log.id);
    }
  },

  async addContactLog(log: Omit<ContactLog, 'id' | 'date'>): Promise<ContactLog> {
    const db = await getDB();
    const newLog: ContactLog = {
      ...log,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    await db.add('contactLogs', newLog);

    const existingFriend = await this.getFriendById(log.friendId);
    await this.updateFriend(log.friendId, {
      lastContactDate: newLog.date,
      contactCount: (existingFriend?.contactCount ?? 0) + 1,
    });

    return newLog;
  },

  async getContactLogs(friendId: string): Promise<ContactLog[]> {
    const db = await getDB();
    const logs = await db.getAllFromIndex('contactLogs', 'by-friendId', friendId);
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getAllReminders(): Promise<Reminder[]> {
    const db = await getDB();
    return db.getAll('reminders');
  },

  async createReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
    const db = await getDB();
    const newReminder: Reminder = {
      ...reminder,
      id: crypto.randomUUID(),
    };
    await db.add('reminders', newReminder);
    return newReminder;
  },

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | undefined> {
    const db = await getDB();
    const reminder = await db.get('reminders', id);

    if (!reminder) {
      return undefined;
    }

    const updatedReminder = { ...reminder, ...updates, id };
    await db.put('reminders', updatedReminder);
    return updatedReminder;
  },

  async deleteReminder(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('reminders', id);
  },
};
