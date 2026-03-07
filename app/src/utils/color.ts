import type { AvatarColor } from '@/types/friend';

const COLORS: AvatarColor[] = ['coral', 'teal', 'gold', 'ink'];

/**
 * 根据名字生成头像颜色
 */
export function getAvatarColorFromName(name: string): AvatarColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * 获取下一个颜色
 */
export function getNextColor(current: AvatarColor): AvatarColor {
  const index = COLORS.indexOf(current);
  return COLORS[(index + 1) % COLORS.length];
}
