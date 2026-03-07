import type { Friend } from '@/types/friend';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * 验证朋友数据
 */
export function validateFriend(friend: Partial<Friend>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!friend.name || friend.name.trim().length === 0) {
    errors.push({ field: 'name', message: '姓名不能为空' });
  } else if (friend.name.length > 50) {
    errors.push({ field: 'name', message: '姓名不能超过 50 个字符' });
  }

  if (friend.nickname && friend.nickname.length > 50) {
    errors.push({ field: 'nickname', message: '昵称不能超过 50 个字符' });
  }

  if (!friend.relationship || friend.relationship.trim().length === 0) {
    errors.push({ field: 'relationship', message: '关系不能为空' });
  }

  if (friend.birthday && !/^\d{2}-\d{2}$/.test(friend.birthday)) {
    errors.push({ field: 'birthday', message: '生日格式不正确，应为 MM-DD' });
  }

  if (friend.notes && friend.notes.length > 2000) {
    errors.push({ field: 'notes', message: '备注不能超过 2000 个字符' });
  }

  return errors;
}

/**
 * 验证 OpenAI API Key 格式
 */
export function validateApiKey(key: string): boolean {
  return key.startsWith('sk-') && key.length > 20;
}
