import { getDB } from '@/database';
import type { BasicInfoField, ContactLog, Friend, Reminder } from '@/types/friend';
import { createEmptyAIPersona } from '@/types/friend';
import { aiService } from '@/services/aiService';
import { compileFriendAIPersona } from '@/utils/friendAIPersona';
import { searchBasicInfoCorpus } from '@/utils/basicInfo';

interface UpdateFriendOptions {
  refreshPersona?: boolean;
}

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeFriendId(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'string') {
    return decodeURIComponent(raw).trim();
  }

  if (raw === null || raw === undefined) {
    return '';
  }

  return String(raw).trim();
}

function normalizeOptionalText(value: unknown, fallback?: string): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  return fallback?.trim() ?? '';
}

function normalizeNumber(value: unknown, fallback?: number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
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

function normalizeBasicInfoFields(value: Friend['basicInfoFields'] | undefined): BasicInfoField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((field) => field && typeof field.label === 'string' && typeof field.value === 'string')
    .map((field) => ({
      id: field.id || crypto.randomUUID(),
      label: field.label.trim(),
      value: field.value.trim(),
      createdAt: typeof field.createdAt === 'string' && field.createdAt ? field.createdAt : new Date().toISOString(),
      sourceText: typeof field.sourceText === 'string' && field.sourceText ? field.sourceText : field.value.trim(),
    }));
}

function normalizeFriendInput(friend: Partial<Friend>, existing?: Friend): Friend {
  const now = new Date().toISOString();
  const preferences = Array.isArray(friend.preferences)
    ? friend.preferences.map((item) => String(item).trim()).filter(Boolean)
    : (existing?.preferences ?? []);

  const name = typeof friend.name === 'string'
    ? friend.name.trim()
    : existing?.name ?? '';

  const normalizedBase: Friend = {
    id: friend.id ?? existing?.id ?? crypto.randomUUID(),
    name,
    nickname: normalizeOptionalText(friend.nickname, existing?.nickname),
    relationship: typeof friend.relationship === 'string'
      ? friend.relationship.trim()
      : existing?.relationship ?? '',
    birthday: normalizeText(typeof friend.birthday === 'string' ? friend.birthday : existing?.birthday),
    gender: normalizeOptionalText(friend.gender, existing?.gender),
    age: normalizeNumber(friend.age, existing?.age),
    heightCm: normalizeNumber(friend.heightCm, existing?.heightCm),
    weightKg: normalizeNumber(friend.weightKg, existing?.weightKg),
    city: normalizeOptionalText(friend.city, existing?.city),
    hometown: normalizeOptionalText(friend.hometown, existing?.hometown),
    occupation: normalizeOptionalText(friend.occupation, existing?.occupation),
    company: normalizeOptionalText(friend.company, existing?.company),
    school: normalizeOptionalText(friend.school, existing?.school),
    major: normalizeOptionalText(friend.major, existing?.major),
    avatarColor: friend.avatarColor ?? existing?.avatarColor ?? 'coral',
    lastContactDate: normalizeText(typeof friend.lastContactDate === 'string' ? friend.lastContactDate : existing?.lastContactDate),
    lastViewedAt: normalizeText(typeof friend.lastViewedAt === 'string' ? friend.lastViewedAt : existing?.lastViewedAt),
    isImportant: typeof friend.isImportant === 'boolean' ? friend.isImportant : existing?.isImportant ?? false,
    preferences,
    notes: typeof friend.notes === 'string' ? friend.notes.trim() : existing?.notes ?? '',
    basicInfoFields: normalizeBasicInfoFields(friend.basicInfoFields ?? existing?.basicInfoFields),
    customFields: normalizeCustomFields(friend.customFields ?? existing?.customFields),
    aiProfile: friend.aiProfile ?? existing?.aiProfile ?? createEmptyAIPersona(now),
    createdAt: existing?.createdAt ?? friend.createdAt ?? now,
    updatedAt: now,
    contactCount: typeof friend.contactCount === 'number' ? friend.contactCount : existing?.contactCount ?? 0,
  };

  return {
    ...normalizedBase,
    aiProfile: compileFriendAIPersona(normalizedBase, now),
  };
}

async function enrichFriendPersona(friend: Friend, existing?: Friend): Promise<Friend> {
  const fallbackPersona = compileFriendAIPersona(friend, friend.updatedAt);
  const currentSource = existing?.aiProfile?.source ?? friend.aiProfile.source;
  const shouldRefreshWithAI = currentSource === 'llm'
    || friend.customFields.length > 0
    || friend.preferences.length > 0
    || friend.basicInfoFields.length > 0;

  if (!shouldRefreshWithAI) {
    return {
      ...friend,
      aiProfile: fallbackPersona,
    };
  }

  try {
    const aiProfile = await aiService.generateFriendPersona(friend);
    return {
      ...friend,
      aiProfile,
    };
  } catch {
    return {
      ...friend,
      aiProfile: fallbackPersona,
    };
  }
}

async function normalizeStoredFriend(friend: Friend): Promise<Friend> {
  const normalizedBase = normalizeFriendInput(friend, friend);
  const normalized = normalizedBase.aiProfile.overview
    ? normalizedBase
    : {
      ...normalizedBase,
      aiProfile: compileFriendAIPersona(normalizedBase, normalizedBase.updatedAt),
    };
  const changed = JSON.stringify(friend) !== JSON.stringify(normalized);

  if (changed) {
    const db = await getDB();
    await db.put('friends', normalized);
  }

  return normalized;
}

function buildSearchCorpus(friend: Friend): string[] {
  return [
    friend.name,
    friend.nickname ?? '',
    friend.relationship,
    friend.gender ?? '',
    String(friend.age ?? ''),
    String(friend.heightCm ?? ''),
    String(friend.weightKg ?? ''),
    friend.city ?? '',
    friend.hometown ?? '',
    friend.occupation ?? '',
    friend.company ?? '',
    friend.school ?? '',
    friend.major ?? '',
    friend.notes,
    ...searchBasicInfoCorpus(friend),
    ...friend.preferences,
    friend.aiProfile.overview,
    ...friend.aiProfile.signals,
    ...friend.aiProfile.traits,
    ...friend.aiProfile.tasteProfile,
    ...friend.aiProfile.interactionStyle,
    ...friend.aiProfile.inferenceHints,
    ...friend.aiProfile.boundaries,
  ];
}

function searchFriendsInList(friends: Friend[], query: string): Friend[] {
  const lowerQuery = query.trim().toLowerCase();

  if (!lowerQuery) {
    return friends;
  }

  return friends.filter((friend) => {
    const customFieldMatched = friend.customFields.some(
      (field) => field.label.toLowerCase().includes(lowerQuery) || field.value.toLowerCase().includes(lowerQuery),
    );

    return buildSearchCorpus(friend).some((value) => value.toLowerCase().includes(lowerQuery)) || customFieldMatched;
  });
}

export const friendService = {
  async getAllFriends(): Promise<Friend[]> {
    const db = await getDB();
    const friends = await db.getAll('friends');
    const normalizedFriends = await Promise.all(friends.map((friend) => normalizeStoredFriend(friend)));

    return normalizedFriends.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async getFriendById(id: string): Promise<Friend | undefined> {
    const normalizedId = normalizeFriendId(id);
    if (!normalizedId) {
      return undefined;
    }

    const db = await getDB();
    const directMatch = await db.get('friends', normalizedId);
    if (directMatch) {
      return normalizeStoredFriend(directMatch);
    }

    const allFriends = await db.getAll('friends');
    const fuzzyMatch = allFriends.find((friend) => normalizeFriendId(friend.id) === normalizedId);
    return fuzzyMatch ? normalizeStoredFriend(fuzzyMatch) : undefined;
  },

  async searchFriends(query: string): Promise<Friend[]> {
    const allFriends = await this.getAllFriends();
    return searchFriendsInList(allFriends, query);
  },

  searchFriendsInMemory(friends: Friend[], query: string): Friend[] {
    return searchFriendsInList(friends, query);
  },

  async createFriend(friend: Partial<Friend>): Promise<Friend> {
    const db = await getDB();
    const plainFriend = JSON.parse(JSON.stringify(friend)) as Partial<Friend>;
    const normalizedBase = normalizeFriendInput(plainFriend);
    const newFriend = await enrichFriendPersona(normalizedBase);
    await db.add('friends', newFriend);
    return newFriend;
  },

  async updateFriend(id: string, updates: Partial<Friend>, options: UpdateFriendOptions = {}): Promise<Friend | undefined> {
    const db = await getDB();
    const existing = await this.getFriendById(id);

    if (!existing) {
      return undefined;
    }

    const plainUpdates = JSON.parse(JSON.stringify(updates)) as Partial<Friend>;
    const normalizedBase = normalizeFriendInput({ ...plainUpdates, id: normalizeFriendId(id) || id }, existing);
    const shouldRefreshPersona = options.refreshPersona ?? false;
    const updatedFriend = shouldRefreshPersona
      ? await enrichFriendPersona(normalizedBase, existing)
      : {
        ...normalizedBase,
        aiProfile: compileFriendAIPersona(normalizedBase, normalizedBase.updatedAt),
      };
    await db.put('friends', updatedFriend);
    return updatedFriend;
  },

  async refreshFriendPersona(id: string): Promise<Friend | undefined> {
    const db = await getDB();
    const existing = await this.getFriendById(id);

    if (!existing) {
      return undefined;
    }

    const refreshedFriend = await enrichFriendPersona(existing, existing);
    await db.put('friends', refreshedFriend);
    return refreshedFriend;
  },

  async deleteFriend(id: string): Promise<void> {
    const normalizedId = normalizeFriendId(id);
    const db = await getDB();
    await db.delete('friends', normalizedId);

    const memorialDays = await db.getAll('memorialDays');
    for (const memorialDay of memorialDays) {
      if (!memorialDay.friendIds.includes(normalizedId)) {
        continue;
      }

      await db.put('memorialDays', {
        ...memorialDay,
        friendIds: memorialDay.friendIds.filter((friendId: string) => friendId !== normalizedId),
        updatedAt: new Date().toISOString(),
      });
    }

    const reminders = await db.getAllFromIndex('reminders', 'by-friendId', normalizedId);
    for (const reminder of reminders) {
      await db.delete('reminders', reminder.id);
    }

    const logs = await db.getAllFromIndex('contactLogs', 'by-friendId', normalizedId);
    for (const log of logs) {
      await db.delete('contactLogs', log.id);
    }

    const conversations = await db.getAllFromIndex('conversations', 'by-friendId', normalizedId);
    for (const conversation of conversations) {
      await db.delete('conversations', conversation.id);
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
