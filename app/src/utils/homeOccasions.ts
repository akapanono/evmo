import type { Friend } from '@/types/friend';
import type { MemorialDay } from '@/types/memorial';
import { formatMonthDay, getDaysUntilBirthday, getDaysUntilMonthDay } from '@/utils/dateHelpers';
import {
  buildBirthdayRecommendation,
  buildMemorialRecommendation,
  normalizeOccasionRecommendation,
} from '@/utils/occasionRecommendations';

export type ReminderRangeKey = 'today' | 'week' | 'month';
export type OccasionType = 'birthday' | 'memorial';

export interface OccasionSuggestionPreview {
  gifts: string[];
}

export interface HomeOccasionItem {
  id: string;
  targetId: string;
  type: OccasionType;
  title: string;
  dateLabel: string;
  relativeLabel: string;
  daysUntil: number;
  friends: Friend[];
  summary: string;
  suggestion: OccasionSuggestionPreview;
}

export interface HomeOccasionSection {
  key: ReminderRangeKey;
  title: string;
  items: HomeOccasionItem[];
}

const RANGE_META: Record<ReminderRangeKey, { title: string }> = {
  today: { title: '今日' },
  week: { title: '一周内' },
  month: { title: '一个月内' },
};

export function buildHomeOccasionSections(friends: Friend[], memorialDays: MemorialDay[]): HomeOccasionSection[] {
  const items = [
    ...buildBirthdayItems(friends),
    ...buildMemorialItems(friends, memorialDays),
  ].sort((a, b) => a.daysUntil - b.daysUntil || a.title.localeCompare(b.title, 'zh-Hans-CN-u-co-pinyin'));

  return (Object.keys(RANGE_META) as ReminderRangeKey[]).map((key) => ({
    key,
    title: RANGE_META[key].title,
    items: items.filter((item) => matchesRange(item.daysUntil, key)),
  }));
}

export function getReminderRangeMeta(key: ReminderRangeKey): { title: string } {
  return RANGE_META[key];
}

export function buildHomeOccasionItem(
  type: OccasionType,
  id: string,
  friends: Friend[],
  memorialDays: MemorialDay[],
): HomeOccasionItem | null {
  if (type === 'birthday') {
    const friend = friends.find((item) => item.id === id && item.birthday);
    if (!friend?.birthday) {
      return null;
    }

    const recommendation = normalizeOccasionRecommendation(friend.birthdayRecommendation, buildBirthdayRecommendation(friend));
    const daysUntil = getDaysUntilBirthday(friend.birthday);
    return {
      id: `birthday:${friend.id}`,
      targetId: friend.id,
      type: 'birthday',
      title: `${friend.name}的生日`,
      dateLabel: formatMonthDay(friend.birthday),
      relativeLabel: formatRelativeLabel(daysUntil),
      daysUntil,
      friends: [friend],
      summary: friend.relationship || '朋友',
      suggestion: { gifts: recommendation.gifts },
    };
  }

  const memorial = memorialDays.find((item) => item.id === id);
  if (!memorial) {
    return null;
  }

  const linkedFriends = memorial.friendIds
    .map((friendId) => friends.find((friend) => friend.id === friendId))
    .filter((friend): friend is Friend => Boolean(friend));
  const recommendation = normalizeOccasionRecommendation(memorial.recommendation, buildMemorialRecommendation(memorial, linkedFriends));
  const daysUntil = getDaysUntilMonthDay(memorial.monthDay);

  return {
    id: `memorial:${memorial.id}`,
    targetId: memorial.id,
    type: 'memorial',
    title: memorial.name,
    dateLabel: formatMonthDay(memorial.monthDay),
    relativeLabel: formatRelativeLabel(daysUntil),
    daysUntil,
    friends: linkedFriends,
    summary: linkedFriends.length > 0 ? `关联 ${linkedFriends.length} 位朋友` : '未关联朋友',
    suggestion: { gifts: recommendation.gifts },
  };
}

function buildBirthdayItems(friends: Friend[]): HomeOccasionItem[] {
  return friends
    .filter((friend) => friend.birthday)
    .map((friend) => {
      const birthday = friend.birthday!;
      const recommendation = normalizeOccasionRecommendation(friend.birthdayRecommendation, buildBirthdayRecommendation(friend));
      const daysUntil = getDaysUntilBirthday(birthday);

      return {
        id: `birthday:${friend.id}`,
        targetId: friend.id,
        type: 'birthday',
        title: `${friend.name}的生日`,
        dateLabel: formatMonthDay(birthday),
        relativeLabel: formatRelativeLabel(daysUntil),
        daysUntil,
        friends: [friend],
        summary: friend.relationship || '朋友',
        suggestion: { gifts: recommendation.gifts },
      };
    });
}

function buildMemorialItems(friends: Friend[], memorialDays: MemorialDay[]): HomeOccasionItem[] {
  return memorialDays.map((item) => {
    const linkedFriends = item.friendIds
      .map((friendId) => friends.find((friend) => friend.id === friendId))
      .filter((friend): friend is Friend => Boolean(friend));
    const recommendation = normalizeOccasionRecommendation(item.recommendation, buildMemorialRecommendation(item, linkedFriends));
    const daysUntil = getDaysUntilMonthDay(item.monthDay);

    return {
      id: `memorial:${item.id}`,
      targetId: item.id,
      type: 'memorial',
      title: item.name,
      dateLabel: formatMonthDay(item.monthDay),
      relativeLabel: formatRelativeLabel(daysUntil),
      daysUntil,
      friends: linkedFriends,
      summary: linkedFriends.length > 0 ? `关联 ${linkedFriends.length} 位朋友` : '未关联朋友',
      suggestion: { gifts: recommendation.gifts },
    };
  });
}

function matchesRange(daysUntil: number, range: ReminderRangeKey): boolean {
  if (!Number.isFinite(daysUntil) || daysUntil < 0 || daysUntil > 30) return false;
  if (range === 'today') return daysUntil === 0;
  if (range === 'week') return daysUntil > 0 && daysUntil <= 7;
  return daysUntil > 7 && daysUntil <= 30;
}

function formatRelativeLabel(daysUntil: number): string {
  if (daysUntil === 0) return '今天';
  if (daysUntil === 1) return '明天';
  return `${daysUntil}天后`;
}
