import type { LocationQueryValue, RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';

export type FriendSourcePage = 'home' | 'calendar' | 'friends';
export type FriendBackTarget = string | RouteLocationRaw;

export function resolveFriendSourcePage(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): FriendSourcePage {
  if (value === 'home') {
    return 'home';
  }

  return value === 'calendar' ? 'calendar' : 'friends';
}

export function getFriendSourcePageFromRoute(route: RouteLocationNormalizedLoaded): FriendSourcePage {
  return resolveFriendSourcePage(route.query.fromPage);
}

export function getFriendSourceQuery(sourcePage: FriendSourcePage): { fromPage: FriendSourcePage } {
  return { fromPage: sourcePage };
}

export function getFriendBackToFromRoute(route: RouteLocationNormalizedLoaded): string | null {
  const value = route.query.backTo;
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return null;
}

export function getFriendBackPath(sourcePage: FriendSourcePage): '/home' | '/calendar' | '/friends' {
  if (sourcePage === 'home') {
    return '/home';
  }

  return sourcePage === 'calendar' ? '/calendar' : '/friends';
}

export function getFriendBackTarget(route: RouteLocationNormalizedLoaded): FriendBackTarget {
  return getFriendBackToFromRoute(route) ?? getFriendBackPath(getFriendSourcePageFromRoute(route));
}

export function getFriendDetailRoute(
  friendId: string,
  sourcePage: FriendSourcePage,
  backTo?: string,
): RouteLocationRaw {
  return {
    name: 'friend-detail',
    params: { id: friendId },
    query: {
      ...getFriendSourceQuery(sourcePage),
      ...(backTo ? { backTo } : {}),
    },
  };
}
