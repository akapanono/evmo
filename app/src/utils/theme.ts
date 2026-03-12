import type { AppSettings } from '@/types/settings';

export const THEME_OPTIONS: Array<{
  value: AppSettings['themeScheme'];
  label: string;
  description: string;
}> = [
  { value: 'default', label: '默认配色', description: '当前这套米白暖调配色。' },
  { value: 'forest', label: '森野配色', description: '偏自然的绿意配色，整体更安静。' },
  { value: 'sunset', label: '落霞配色', description: '偏暖橘和金色的夕照风格。' },
  { value: 'ocean', label: '海雾配色', description: '偏蓝灰和水色的清爽风格。' },
];

export function applyThemeScheme(themeScheme: AppSettings['themeScheme']): void {
  document.documentElement.setAttribute('data-theme', themeScheme || 'default');
}
