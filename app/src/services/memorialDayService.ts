import { getDB } from '@/database';
import type { MemorialDay } from '@/types/memorial';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function normalizeMonthDay(value: string): string | undefined {
  const trimmed = value.trim();
  const matched = trimmed.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!matched?.[1] || !matched[2]) {
    return undefined;
  }

  const month = Number(matched[1]);
  const day = Number(matched[2]);
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  return `${pad(month)}-${pad(day)}`;
}

function normalizeFriendIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
}

function normalizeMemorial(input: Partial<MemorialDay>, existing?: MemorialDay): MemorialDay {
  const now = new Date().toISOString();
  const monthDay = normalizeMonthDay(
    typeof input.monthDay === 'string' ? input.monthDay : existing?.monthDay ?? '',
  );

  if (!monthDay) {
    throw new Error('纪念日日期需要使用 MM-DD 格式。');
  }

  const name = typeof input.name === 'string' ? input.name.trim() : existing?.name?.trim() ?? '';
  if (!name) {
    throw new Error('纪念日名称不能为空。');
  }

  return {
    id: input.id ?? existing?.id ?? crypto.randomUUID(),
    name,
    monthDay,
    friendIds: normalizeFriendIds(input.friendIds ?? existing?.friendIds),
    note: typeof input.note === 'string'
      ? input.note.trim() || undefined
      : existing?.note,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };
}

function sortMemorials(items: MemorialDay[]): MemorialDay[] {
  return [...items].sort((a, b) => {
    if (a.monthDay !== b.monthDay) {
      return a.monthDay.localeCompare(b.monthDay);
    }
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

export const memorialDayService = {
  async getAllMemorialDays(): Promise<MemorialDay[]> {
    const db = await getDB();
    return sortMemorials(await db.getAll('memorialDays'));
  },

  async createMemorialDay(input: Partial<MemorialDay>): Promise<MemorialDay> {
    const db = await getDB();
    const memorialDay = normalizeMemorial(input);
    await db.add('memorialDays', memorialDay);
    return memorialDay;
  },

  async updateMemorialDay(id: string, updates: Partial<MemorialDay>): Promise<MemorialDay | undefined> {
    const db = await getDB();
    const existing = await db.get('memorialDays', id);
    if (!existing) {
      return undefined;
    }

    const memorialDay = normalizeMemorial({ ...updates, id }, existing);
    await db.put('memorialDays', memorialDay);
    return memorialDay;
  },

  async deleteMemorialDay(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('memorialDays', id);
  },

  async replaceMemorialDays(items: MemorialDay[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('memorialDays', 'readwrite');
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(normalizeMemorial(item, item));
    }
    await tx.done;
  },
};
