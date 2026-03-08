import type { AvatarColor } from '@/types/friend';

const COLORS = ['coral', 'teal', 'gold', 'ink'] as const satisfies readonly AvatarColor[];

export function getAvatarColorFromName(name: string): AvatarColor {
  let hash = 0;

  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return COLORS[Math.abs(hash) % COLORS.length]!;
}

export function getNextColor(current: AvatarColor): AvatarColor {
  const index = COLORS.indexOf(current);
  const nextIndex = index === -1 ? 0 : (index + 1) % COLORS.length;
  return COLORS[nextIndex]!;
}
