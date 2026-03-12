import { parseISO } from 'date-fns';

export const BEIJING_TIME_ZONE = 'Asia/Shanghai';

interface BeijingDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const beijingFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: BEIJING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function getBeijingDateParts(date: Date = new Date()): BeijingDateParts {
  const parts = beijingFormatter.formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  };
}

export function getTodayMonthDayInBeijing(date: Date = new Date()): string {
  const parts = getBeijingDateParts(date);
  return `${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function formatDate(date: string | Date, fmt = 'yyyy-MM-dd'): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  const parts = getBeijingDateParts(parsed);

  return fmt
    .replace('yyyy', String(parts.year))
    .replace('MM', String(parts.month).padStart(2, '0'))
    .replace('dd', String(parts.day).padStart(2, '0'))
    .replace('HH', String(parts.hour).padStart(2, '0'))
    .replace('mm', String(parts.minute).padStart(2, '0'))
    .replace('ss', String(parts.second).padStart(2, '0'));
}

export function formatBirthday(birthday: string): string {
  const parts = birthday.split('-');
  if (parts.length !== 2) {
    return birthday;
  }

  const month = Number(parts[0]);
  const day = Number(parts[1]);

  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return birthday;
  }

  return `${month} 月 ${day} 日`;
}

export function formatMonthDay(monthDay: string): string {
  return formatBirthday(monthDay);
}

export function isBirthdayToday(birthday: string): boolean {
  const parts = birthday.split('-');
  if (parts.length !== 2) {
    return false;
  }

  const month = Number(parts[0]);
  const day = Number(parts[1]);

  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return false;
  }

  const today = getBeijingDateParts();
  return today.month === month && today.day === day;
}

export function getDaysUntilBirthday(birthday: string): number {
  const parts = birthday.split('-');
  if (parts.length !== 2) {
    return Number.POSITIVE_INFINITY;
  }

  const month = Number(parts[0]);
  const day = Number(parts[1]);

  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return Number.POSITIVE_INFINITY;
  }

  const today = getBeijingDateParts();
  const todaySerial = toDaySerial(today.year, today.month, today.day);
  let targetSerial = toDaySerial(today.year, month, day);

  if (targetSerial < todaySerial) {
    targetSerial = toDaySerial(today.year + 1, month, day);
  }

  return targetSerial - todaySerial;
}

export function getDaysUntilMonthDay(monthDay: string): number {
  return getDaysUntilBirthday(monthDay);
}

export function getDaysSince(dateStr: string): number {
  const target = getBeijingDateParts(parseISO(dateStr));
  const today = getBeijingDateParts();
  return toDaySerial(today.year, today.month, today.day) - toDaySerial(target.year, target.month, target.day);
}

export function getRelativeTime(dateStr: string): string {
  const days = getDaysSince(dateStr);

  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;

  return `${Math.floor(days / 365)} 年前`;
}

function toDaySerial(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}
