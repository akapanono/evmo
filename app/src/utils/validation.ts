import type { Friend } from '@/types/friend';

export interface ValidationError {
  field: string;
  message: string;
}

function isLikelyValidMonthDay(value: string): boolean {
  if (!/^\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [monthText, dayText] = value.split('-');
  const month = Number(monthText);
  const day = Number(dayText);
  const monthDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12) {
    return false;
  }

  const maxDay = monthDays[month - 1];
  return typeof maxDay === 'number' && day >= 1 && day <= maxDay;
}

function looksReasonableName(value: string): boolean {
  const cleaned = value.trim();
  if (cleaned.length < 1 || cleaned.length > 30) {
    return false;
  }

  if (/^\d+$/.test(cleaned)) {
    return false;
  }

  if (/^[^\p{L}A-Za-z\u4e00-\u9fa5]+$/u.test(cleaned)) {
    return false;
  }

  return true;
}

function looksReasonableRelationship(value: string): boolean {
  const cleaned = value.trim();
  if (cleaned.length < 1 || cleaned.length > 20) {
    return false;
  }

  if (/^\d+$/.test(cleaned)) {
    return false;
  }

  return true;
}

export function validateFriend(friend: Partial<Friend>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!friend.name || friend.name.trim().length === 0) {
    errors.push({ field: 'name', message: '姓名不能为空。' });
  } else if (!looksReasonableName(friend.name)) {
    errors.push({ field: 'name', message: '姓名看起来不合常理，请检查后再保存。' });
  }

  if (friend.nickname && friend.nickname.trim().length > 30) {
    errors.push({ field: 'nickname', message: '昵称不能超过 30 个字符。' });
  }

  if (!friend.relationship || friend.relationship.trim().length === 0) {
    errors.push({ field: 'relationship', message: '关系不能为空。' });
  } else if (!looksReasonableRelationship(friend.relationship)) {
    errors.push({ field: 'relationship', message: '关系信息看起来不合常理，请检查后再保存。' });
  }

  if (friend.birthday && !isLikelyValidMonthDay(friend.birthday)) {
    errors.push({ field: 'birthday', message: '生日格式或日期不合理，应为 MM-DD，例如 03-07。' });
  }

  if (friend.preferences && friend.preferences.some((item) => item.trim().length > 30)) {
    errors.push({ field: 'preferences', message: '偏好标签单项不能超过 30 个字符。' });
  }

  if (friend.notes && friend.notes.length > 2000) {
    errors.push({ field: 'notes', message: '备注不能超过 2000 个字符。' });
  }

  return errors;
}

export function validateApiKey(key: string): boolean {
  return key.startsWith('sk-') && key.length > 20;
}
