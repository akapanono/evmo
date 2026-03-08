export interface AppSettings {
  openaiApiKey?: string;
  openaiModel: string;

  birthdayReminder: {
    enabled: boolean;
    daysBefore: number;
    time: string;
  };

  lockScreen: boolean;
  hideSensitiveInfo: boolean;

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
  lockScreen: false,
  hideSensitiveInfo: false,
  aiStyle: 'friendly',
  defaultQuestions: [
    '她最近适合聊什么？',
    '送她什么更合适？',
    '我现在联系她合适吗？',
  ],
};
