import { useLocalStorage } from '@vueuse/core';
import type { AppSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { STORAGE_KEY_SETTINGS } from '@/utils/constants';

export const storageService = {
  /**
   * 获取设置
   */
  getSettings(): AppSettings {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * 保存设置
   */
  saveSettings(settings: Partial<AppSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
  },

  /**
   * 响应式设置
   */
  useSettings() {
    return useLocalStorage<AppSettings>(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS, {
      mergeDefaults: true,
    });
  },
};
