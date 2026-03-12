import type { LocationQueryValue, RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';

export type FriendSourcePage = 'home' | 'calendar' | 'friends';

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

export function getFriendBackPath(sourcePage: FriendSourcePage): '/home' | '/calendar' | '/friends' {
  if (sourcePage === 'home') {
    return '/home';
  }

  return sourcePage === 'calendar' ? '/calendar' : '/friends';
}

export function getFriendDetailRoute(friendId: string, sourcePage: FriendSourcePage): RouteLocationRaw {
  return {
    name: 'friend-detail',
    params: { id: friendId },
    query: getFriendSourceQuery(sourcePage),
  };
}
