export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export type AvatarColor = 'coral' | 'teal' | 'gold' | 'ink';

export interface Friend {
  id: string;
  name: string;
  nickname?: string;
  relationship: string;
  birthday?: string; // 格式: "MM-DD"
  avatarColor: AvatarColor;
  lastContactDate?: string; // ISO date string
  isImportant: boolean;

  // 自定义信息
  preferences: string[]; // 偏好标签
  notes: string; // 自由文本记录
  customFields: CustomField[];

  // 元数据
  createdAt: string;
  updatedAt: string;
  contactCount: number;
}

export interface Reminder {
  id: string;
  friendId: string;
  type: 'birthday' | 'contact' | 'custom';
  title: string;
  date: string;
  isActive: boolean;
}

export interface ContactLog {
  id: string;
  friendId: string;
  date: string;
  notes?: string;
  type: 'call' | 'message' | 'meeting' | 'other';
}

export const AVATAR_COLORS: AvatarColor[] = ['coral', 'teal', 'gold', 'ink'];

export function createEmptyFriend(): Friend {
  return {
    id: crypto.randomUUID(),
    name: '',
    nickname: '',
    relationship: '',
    birthday: undefined,
    avatarColor: 'coral',
    lastContactDate: undefined,
    isImportant: false,
    preferences: [],
    notes: '',
    customFields: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contactCount: 0,
  };
}
