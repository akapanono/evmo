import {
  format,
  parseISO,
  differenceInDays,
  isToday,
  isBefore,
  addDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化日期为可读字符串
 */
export function formatDate(date: string | Date, fmt = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: zhCN });
}

/**
 * 格式化生日显示
 */
export function formatBirthday(birthday: string): string {
  const [month, day] = birthday.split('-');
  return `${month} 月 ${parseInt(day, 10)} 日`;
}

/**
 * 判断今天是否是某人生日
 */
export function isBirthdayToday(birthday: string): boolean {
  const today = new Date();
  const [month, day] = birthday.split('-').map(Number);
  return today.getMonth() + 1 === month && today.getDate() === day;
}

/**
 * 计算距离生日还有多少天
 * 返回负数表示今年生日已过
 */
export function getDaysUntilBirthday(birthday: string): number {
  const today = new Date();
  const [month, day] = birthday.split('-').map(Number);

  let birthdayThisYear = new Date(today.getFullYear(), month - 1, day);

  if (isBefore(birthdayThisYear, today) && !isToday(birthdayThisYear)) {
    birthdayThisYear = new Date(today.getFullYear() + 1, month - 1, day);
  }

  return differenceInDays(birthdayThisYear, today);
}

/**
 * 计算两个日期之间相差的天数
 */
export function getDaysSince(dateStr: string): number {
  const date = parseISO(dateStr);
  return differenceInDays(new Date(), date);
}

/**
 * 获取相对时间描述（如 "5 天前"）
 */
export function getRelativeTime(dateStr: string): string {
  const days = getDaysSince(dateStr);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

/**
 * 判断是否需要联系提醒
 */
export function needsContactReminder(
  lastContactDate: string | undefined,
  thresholdDays: number
): boolean {
  if (!lastContactDate) return true;
  return getDaysSince(lastContactDate) >= thresholdDays;
}
