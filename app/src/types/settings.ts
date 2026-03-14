function normalizeDefaultProxyServerUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
}

const FALLBACK_PROXY_SERVER_URL = 'http://14.103.80.102';

export const DEFAULT_PROXY_SERVER_URL = normalizeDefaultProxyServerUrl(import.meta.env.VITE_PROXY_SERVER_URL)
  || FALLBACK_PROXY_SERVER_URL;

export interface AppSettings {
  profileName?: string;
  profilePhone?: string;
  profileDeviceName?: string;

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
  biometricLock: boolean;

  aiStyle: 'friendly' | 'professional' | 'concise';
  aiReadBasicProfile: boolean;
  aiReadPreferences: boolean;
  aiReadMemorials: boolean;
  aiReadRecentActivity: boolean;
  themeScheme: 'default' | 'forest' | 'sunset' | 'ocean';
  defaultQuestions: string[];
  friendSortMode: 'name' | 'contact' | 'viewed';

  boundPhone: string;

  startPage: 'home' | 'calendar' | 'friends';
  allowCellularAI: boolean;
  wifiOnlyBackup: boolean;
  autoBackup: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  profileName: '我的账号',
  profilePhone: '',
  profileDeviceName: '当前设备',
  openaiModel: 'ep-20260309112425-mwdsp',
  proxyServerUrl: DEFAULT_PROXY_SERVER_URL,
  proxyProviderId: '',
  birthdayReminder: {
    enabled: true,
    daysBefore: 1,
    time: '09:00',
  },
  lockScreen: false,
  hideSensitiveInfo: false,
  biometricLock: false,
  aiStyle: 'friendly',
  aiReadBasicProfile: true,
  aiReadPreferences: true,
  aiReadMemorials: true,
  aiReadRecentActivity: false,
  themeScheme: 'default',
  defaultQuestions: [
    '最近适合怎么和 TA 打开话题？',
    '我该怎么更自然地表达关心？',
    '如果我想准备一份礼物，应该从哪里下手？',
  ],
  friendSortMode: 'viewed',
  boundPhone: '',
  startPage: 'home',
  allowCellularAI: true,
  wifiOnlyBackup: true,
  autoBackup: false,
};
