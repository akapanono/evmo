export interface AppSettings {
  profileName?: string;
  profilePhone?: string;
  profileDeviceName?: string;

  aiAccessMode: 'direct' | 'proxy';
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel: string;
  proxyServerUrl?: string;
  proxyProviderId?: string;

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
  profileName: '我的账号',
  profilePhone: '',
  profileDeviceName: '当前设备',
  aiAccessMode: 'direct',
  openaiBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  openaiModel: 'ep-20260309112425-mwdsp',
  proxyServerUrl: 'http://localhost:8787',
  proxyProviderId: 'openai',
  birthdayReminder: {
    enabled: true,
    daysBefore: 1,
    time: '09:00',
  },
  lockScreen: false,
  hideSensitiveInfo: false,
  aiStyle: 'friendly',
  defaultQuestions: [
    '你最近在忙什么？',
    '你现在最想聊什么？',
    '我现在联系你合适吗？',
  ],
};
