import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { AppSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { storageService } from '@/services/storageService';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(storageService.getSettings());

  // 监听变化并自动保存
  watch(
    settings,
    (newSettings) => {
      storageService.saveSettings(newSettings);
    },
    { deep: true }
  );

  function updateSettings(updates: Partial<AppSettings>): void {
    settings.value = { ...settings.value, ...updates };
  }

  function resetSettings(): void {
    settings.value = { ...DEFAULT_SETTINGS };
  }

  return {
    settings,
    updateSettings,
    resetSettings,
  };
});
