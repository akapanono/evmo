import type { CustomField, Friend } from '@/types/friend';
import { getBeijingDateParts } from '@/utils/dateHelpers';

export interface TimelineCalendarEvent {
  id: string;
  friendId: string;
  friendName: string;
  relationship: string;
  title: string;
  monthDay: string;
  resolvedDateText: string;
  timeText?: string;
}

interface ResolvedDateTime {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
}

type DateOnly = Omit<ResolvedDateTime, 'hour' | 'minute'>;

const WEEKDAY_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 7,
  天: 7,
};

export function buildTimelineCalendarEvents(friends: Friend[]): TimelineCalendarEvent[] {
  return friends.flatMap((friend) =>
    friend.customFields
      .filter((field) => field.temporalScope === 'timebound' && field.includeInTimeline)
      .map((field) => buildTimelineCalendarEvent(friend, field))
      .filter((item): item is TimelineCalendarEvent => Boolean(item)),
  );
}

function buildTimelineCalendarEvent(friend: Friend, field: CustomField): TimelineCalendarEvent | null {
  const resolved = resolveTimelineDate(field);
  if (!resolved) {
    return null;
  }

  return {
    id: field.id,
    friendId: friend.id,
    friendName: friend.name,
    relationship: friend.relationship,
    title: field.value.trim(),
    monthDay: `${String(resolved.month).padStart(2, '0')}-${String(resolved.day).padStart(2, '0')}`,
    resolvedDateText: `${resolved.year}-${String(resolved.month).padStart(2, '0')}-${String(resolved.day).padStart(2, '0')}`,
    timeText: resolved.hour !== undefined
      ? `${String(resolved.hour).padStart(2, '0')}:${String(resolved.minute ?? 0).padStart(2, '0')}`
      : undefined,
  };
}

function resolveTimelineDate(field: CustomField): ResolvedDateTime | null {
  const anchorDate = new Date(field.createdAt);
  const anchor = getBeijingDateParts(anchorDate);
  const source = [field.eventTimeText, field.sourceText, field.value].filter(Boolean).join(' ');
  const time = parseClockTime(source);

  const parsers = [
    parseAbsoluteMonthDay,
    parseRelativeNamedDate,
    parseRelativeOffsetDate,
    parseMonthBoundaryDate,
    parseRelativeMonthDate,
    parseOrdinalWeekdayDate,
    parseWeekdayDate,
  ];

  for (const parser of parsers) {
    const resolved = parser(source, anchor);
    if (resolved) {
      return { ...resolved, ...time };
    }
  }

  return null;
}

function parseAbsoluteMonthDay(text: string, anchor: DateOnly): DateOnly | null {
  const chinese = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  const dashed = text.match(/\b(\d{1,2})-(\d{1,2})\b/);
  const matched = chinese ?? dashed;
  if (!matched?.[1] || !matched[2]) {
    return null;
  }

  const month = Number(matched[1]);
  const day = Number(matched[2]);
  if (!isValidMonthDay(month, day)) {
    return null;
  }

  const anchorSerial = toDaySerial(anchor.year, anchor.month, anchor.day);
  let year = anchor.year;
  if (toDaySerial(year, month, day) < anchorSerial) {
    year += 1;
  }

  return { year, month, day };
}

function parseRelativeNamedDate(text: string, anchor: DateOnly): DateOnly | null {
  if (/今天/.test(text)) return addDays(anchor, 0);
  if (/明天/.test(text)) return addDays(anchor, 1);
  if (/后天/.test(text)) return addDays(anchor, 2);
  if (/大后天/.test(text)) return addDays(anchor, 3);
  if (/昨天/.test(text)) return addDays(anchor, -1);
  if (/前天/.test(text)) return addDays(anchor, -2);
  return null;
}

function parseRelativeOffsetDate(text: string, anchor: DateOnly): DateOnly | null {
  const dayLater = text.match(/(\d{1,2})天后/);
  if (dayLater?.[1]) {
    return addDays(anchor, Number(dayLater[1]));
  }

  const dayBefore = text.match(/(\d{1,2})天前/);
  if (dayBefore?.[1]) {
    return addDays(anchor, -Number(dayBefore[1]));
  }

  const weekLater = text.match(/(\d{1,2})周后/);
  if (weekLater?.[1]) {
    return addDays(anchor, Number(weekLater[1]) * 7);
  }

  const weekBefore = text.match(/(\d{1,2})周前/);
  if (weekBefore?.[1]) {
    return addDays(anchor, -Number(weekBefore[1]) * 7);
  }

  return null;
}

function parseMonthBoundaryDate(text: string, anchor: DateOnly): DateOnly | null {
  if (/本月底|这个月底/.test(text)) {
    return endOfMonth(anchor.year, anchor.month);
  }

  if (/本月初|这个月初/.test(text)) {
    return { year: anchor.year, month: anchor.month, day: 1 };
  }

  if (/下月底/.test(text)) {
    const next = addMonths(anchor, 1, 1);
    return endOfMonth(next.year, next.month);
  }

  if (/下月初/.test(text)) {
    return addMonths(anchor, 1, 1);
  }

  return null;
}

function parseRelativeMonthDate(text: string, anchor: DateOnly): DateOnly | null {
  const relativeMonth = text.match(/(本月|这个月|下个月|下下个月|上个月|上上个月)(\d{1,2})[日号]?/);
  if (relativeMonth?.[1] && relativeMonth[2]) {
    const scope = relativeMonth[1];
    const targetDay = Number(relativeMonth[2]);
    const deltaMonths = scope === '下个月'
      ? 1
      : scope === '下下个月'
        ? 2
        : scope === '上个月'
          ? -1
          : scope === '上上个月'
            ? -2
            : 0;
    return addMonths(anchor, deltaMonths, targetDay);
  }

  const afterMonth = text.match(/(\d{1,2})个月后/);
  if (afterMonth?.[1]) {
    return addMonths(anchor, Number(afterMonth[1]), anchor.day);
  }

  return null;
}

function parseOrdinalWeekdayDate(text: string, anchor: DateOnly): DateOnly | null {
  const monthOrdinal = text.match(/(本月|这个月|下个月|下下个月|上个月|上上个月)?第([一二三四五])个(?:周|星期)([一二三四五六日天])/);
  if (monthOrdinal?.[2] && monthOrdinal[3]) {
    const scope = monthOrdinal[1] ?? '本月';
    const weekday = WEEKDAY_MAP[monthOrdinal[3]];
    const ordinal = getOrdinalNumber(monthOrdinal[2]);
    if (!weekday || !ordinal) {
      return null;
    }

    const deltaMonths = scope === '下个月'
      ? 1
      : scope === '下下个月'
        ? 2
        : scope === '上个月'
          ? -1
          : scope === '上上个月'
            ? -2
            : 0;
    const monthBase = addMonths(anchor, deltaMonths, 1);
    return getNthWeekdayOfMonth(monthBase.year, monthBase.month, weekday, ordinal);
  }

  const afterMonthOrdinal = text.match(/下个月后的第([一二三四五])个(?:周|星期)([一二三四五六日天])/);
  if (afterMonthOrdinal?.[1] && afterMonthOrdinal[2]) {
    const weekday = WEEKDAY_MAP[afterMonthOrdinal[2]];
    const ordinal = getOrdinalNumber(afterMonthOrdinal[1]);
    if (!weekday || !ordinal) {
      return null;
    }

    const monthBase = addMonths(anchor, 2, 1);
    return getNthWeekdayOfMonth(monthBase.year, monthBase.month, weekday, ordinal);
  }

  return null;
}

function parseWeekdayDate(text: string, anchor: DateOnly): DateOnly | null {
  const weekMatch = text.match(/(本周|这周|本星期|这星期|下周|下星期|下下周|下下星期|上周|上星期|上上周|上上星期)?(?:周|星期)([一二三四五六日天])/);
  if (!weekMatch?.[2]) {
    return null;
  }

  const prefix = weekMatch[1] ?? '';
  const weekday = WEEKDAY_MAP[weekMatch[2]];
  if (!weekday) {
    return null;
  }

  const weekOffset = prefix.startsWith('下下')
    ? 2
    : prefix.startsWith('下')
      ? 1
      : prefix.startsWith('上上')
        ? -2
        : prefix.startsWith('上')
          ? -1
          : 0;

  return resolveWeekday(anchor, weekday, weekOffset, prefix === '');
}

function parseClockTime(text: string): Pick<ResolvedDateTime, 'hour' | 'minute'> {
  const explicit = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (explicit?.[1] && explicit[2]) {
    return { hour: Number(explicit[1]), minute: Number(explicit[2]) };
  }

  const chinese = text.match(/(凌晨|早上|上午|中午|下午|晚上|傍晚)?\s*(\d{1,2})点(?:(半)|(\d{1,2})分?)?/);
  if (!chinese?.[2]) {
    return {};
  }

  let hour = Number(chinese[2]);
  const minute = chinese[3] ? 30 : chinese[4] ? Number(chinese[4]) : 0;
  const period = chinese[1] ?? '';

  if ((period === '下午' || period === '晚上' || period === '傍晚') && hour < 12) {
    hour += 12;
  }
  if (period === '中午' && hour < 11) {
    hour += 12;
  }
  if ((period === '凌晨' || period === '早上' || period === '上午') && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

function resolveWeekday(anchor: DateOnly, weekday: number, weekOffset: number, preferForward: boolean): DateOnly {
  const currentWeekday = getChineseWeekday(anchor);
  let delta = weekday - currentWeekday + weekOffset * 7;

  if (preferForward && delta < 0) {
    delta += 7;
  }

  return addDays(anchor, delta);
}

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, ordinal: number): DateOnly | null {
  const firstWeekday = getChineseWeekday({ year, month, day: 1 });
  const delta = (weekday - firstWeekday + 7) % 7;
  const day = 1 + delta + (ordinal - 1) * 7;
  if (!isValidMonthDay(month, day)) {
    return null;
  }
  return { year, month, day };
}

function getChineseWeekday(date: DateOnly): number {
  const jsWeekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return jsWeekday === 0 ? 7 : jsWeekday;
}

function getOrdinalNumber(value: string): number | null {
  const map: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
  };

  return map[value] ?? null;
}

function endOfMonth(year: number, month: number): DateOnly {
  return {
    year,
    month,
    day: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

function addDays(base: DateOnly, delta: number): DateOnly {
  const date = new Date(Date.UTC(base.year, base.month - 1, base.day + delta));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function addMonths(base: DateOnly, deltaMonths: number, targetDay: number): DateOnly {
  const date = new Date(Date.UTC(base.year, base.month - 1 + deltaMonths, 1));
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    year,
    month,
    day: Math.min(targetDay, maxDay),
  };
}

function toDaySerial(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function isValidMonthDay(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const maxDay = new Date(Date.UTC(2024, month, 0)).getUTCDate();
  return day <= maxDay;
}
