import {
  differenceInDays,
  format,
  isBefore,
  isToday,
  parseISO,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDate(date: string | Date, fmt = 'yyyy-MM-dd'): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return format(parsed, fmt, { locale: zhCN });
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

  const today = new Date();
  return today.getMonth() + 1 === month && today.getDate() === day;
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

  const today = new Date();
  let birthdayThisYear = new Date(today.getFullYear(), month - 1, day);

  if (isBefore(birthdayThisYear, today) && !isToday(birthdayThisYear)) {
    birthdayThisYear = new Date(today.getFullYear() + 1, month - 1, day);
  }

  return differenceInDays(birthdayThisYear, today);
}

export function getDaysUntilMonthDay(monthDay: string): number {
  return getDaysUntilBirthday(monthDay);
}

export function getDaysSince(dateStr: string): number {
  const date = parseISO(dateStr);
  return differenceInDays(new Date(), date);
}

export function getRelativeTime(dateStr: string): string {
  const days = getDaysSince(dateStr);

  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;

  return `${Math.floor(days / 365)} 年前`;
}
