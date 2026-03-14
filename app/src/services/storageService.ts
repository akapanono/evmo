import { useLocalStorage } from '@vueuse/core';
import type { AuthSession, AuthUser } from '@/types/auth';
import type { AppSettings } from '@/types/settings';
import { DEFAULT_PROXY_SERVER_URL, DEFAULT_SETTINGS } from '@/types/settings';
import { STORAGE_KEY_AUTH_TOKEN, STORAGE_KEY_AUTH_USER, STORAGE_KEY_SETTINGS } from '@/utils/constants';

function normalizeSettings(settings: AppSettings): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    proxyServerUrl: DEFAULT_PROXY_SERVER_URL,
    themeScheme: settings.themeScheme || DEFAULT_SETTINGS.themeScheme,
    birthdayReminder: {
      ...DEFAULT_SETTINGS.birthdayReminder,
      ...(settings.birthdayReminder || {}),
    },
  };
}

export const storageService = {
  /**
   * 获取设置
   */
  getSettings(): AppSettings {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (stored) {
      try {
        return normalizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch {
        return normalizeSettings(DEFAULT_SETTINGS);
      }
    }
    return normalizeSettings(DEFAULT_SETTINGS);
  },

  /**
   * 保存设置
   */
  saveSettings(settings: Partial<AppSettings>): void {
    const current = this.getSettings();
    const updated = normalizeSettings({ ...current, ...settings });
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
  },

  /**
   * 响应式设置
   */
  useSettings() {
    return useLocalStorage<AppSettings>(STORAGE_KEY_SETTINGS, normalizeSettings(DEFAULT_SETTINGS), {
      mergeDefaults: true,
      serializer: {
        read: (value) => {
          try {
            return normalizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(value) });
          } catch {
            return normalizeSettings(DEFAULT_SETTINGS);
          }
        },
        write: (value) => JSON.stringify(normalizeSettings(value)),
      },
    });
  },

  getAuthSession(): AuthSession | null {
    const token = localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
    const rawUser = localStorage.getItem(STORAGE_KEY_AUTH_USER);
    if (!token || !rawUser) {
      return null;
    }

    try {
      const user = JSON.parse(rawUser) as AuthUser;
      if (!user?.id) {
        return null;
      }

      return { token, user };
    } catch {
      return null;
    }
  },

  saveAuthSession(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, session.token);
    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(session.user));
  },

  clearAuthSession(): void {
    localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
  },
};
