export interface AppSettings {
  openaiApiKey?: string;
  openaiModel: string;

  // 提醒设置
  birthdayReminder: {
    enabled: boolean;
    daysBefore: number;
    time: string;
  };
  contactReminder: {
    enabled: boolean;
    daysThreshold: number; // 多少天未联系提醒
  };

  // 隐私设置
  lockScreen: boolean;
  hideSensitiveInfo: boolean;

  // AI 设置
  aiStyle: 'friendly' | 'professional' | 'concise';
  defaultQuestions: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  openaiModel: 'gpt-3.5-turbo',
  birthdayReminder: {
    enabled: true,
    daysBefore: 1,
    time: '09:00',
  },
  contactReminder: {
    enabled: true,
    daysThreshold: 30,
  },
  lockScreen: false,
  hideSensitiveInfo: false,
  aiStyle: 'friendly',
  defaultQuestions: [
    '她最近适合聊什么？',
    '送她什么更合适？',
    '我现在联系她合适吗？',
  ],
};
