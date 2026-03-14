import type { AppSettings } from '@/types/settings';

export const THEME_OPTIONS: Array<{
  value: AppSettings['themeScheme'];
  label: string;
  description: string;
}> = [
  {
    value: 'default',
    label: '暖金森林',
    description: '米金和深绿的平衡配色，适合默认使用。',
  },
  {
    value: 'forest',
    label: '清晨林地',
    description: '更偏自然绿调，整体更柔和、轻松。',
  },
  {
    value: 'sunset',
    label: '日落琥珀',
    description: '暖橙和琥珀色更明显，氛围更浓。',
  },
  {
    value: 'ocean',
    label: '海雾青蓝',
    description: '偏青蓝和灰绿，观感更清爽克制。',
  },
];

function normalizeThemeScheme(themeScheme: AppSettings['themeScheme'] | string | undefined): AppSettings['themeScheme'] {
  return themeScheme === 'forest' || themeScheme === 'sunset' || themeScheme === 'ocean' ? themeScheme : 'default';
}

export function applyThemeScheme(themeScheme: AppSettings['themeScheme']): void {
  document.documentElement.setAttribute('data-theme', normalizeThemeScheme(themeScheme));
}
