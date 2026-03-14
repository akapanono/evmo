<template>
  <main class="app-stage">
    <section
      :class="[
        'phone-app',
        {
          'has-bottom-nav': showBottomNav,
          'has-floating-action': showFloatingAction,
        },
      ]"
      aria-label="友记应用界面"
    >
      <router-view v-slot="{ Component }">
        <Transition name="screen-slide" mode="out-in" appear>
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </router-view>

      <Transition name="floating-switch" mode="out-in" appear>
        <FloatingButton
          v-if="floatingAction"
          :key="floatingAction"
          :variant="floatingAction"
          @click="handleFloatingAction"
        />
      </Transition>

      <Transition name="overlay-fade" appear>
        <BottomNav v-if="showBottomNav" />
      </Transition>
    </section>
  </main>
</template>

<script setup lang="ts">
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import BottomNav from '@/components/layout/BottomNav.vue';
import FloatingButton from '@/components/layout/FloatingButton.vue';
import { useFriendsStore } from '@/stores/friends';
import { getFriendBackTarget, getFriendDetailRoute, getFriendSourcePageFromRoute } from '@/utils/friendNavigation';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();
const isNativeApp = Capacitor.isNativePlatform();

const mainTabs = new Set(['/home', '/calendar', '/friends', '/me']);
let removeBackButtonListener: (() => Promise<void>) | null = null;

const currentFriendId = computed(() => {
  const rawId = route.params.id;
  if (typeof rawId === 'string') {
    return decodeURIComponent(rawId).trim();
  }

  return '';
});

const currentRouteHasFriend = computed(() => {
  if (!currentFriendId.value) {
    return false;
  }

  return friendsStore.friends.some((friend) => String(friend.id).trim() === currentFriendId.value);
});

const showBottomNav = computed(() => mainTabs.has(route.path));
const floatingAction = computed<'add' | 'ask' | null>(() => {
  if (route.path === '/friends') {
    return 'add';
  }

  if (route.name === 'friend-detail' && currentRouteHasFriend.value) {
    return 'ask';
  }

  return null;
});
const showFloatingAction = computed(() => Boolean(floatingAction.value));

function navigateToAdd(): void {
  if (route.path === '/calendar') {
    router.push('/memorial/new');
    return;
  }

  router.push('/add');
}

function navigateToAsk(): void {
  const friendId = route.path.split('/')[2];
  if (friendId) {
    router.push({
      name: 'ask-ai',
      params: { id: friendId },
      query: {
        fromPage: getFriendSourcePageFromRoute(route),
      },
    });
  }
}

function handleFloatingAction(): void {
  if (floatingAction.value === 'ask') {
    navigateToAsk();
    return;
  }

  navigateToAdd();
}

function getNativeBackTarget(): RouteLocationRaw | null {
  const sourcePage = getFriendSourcePageFromRoute(route);

  if (route.name === 'auth') {
    return typeof route.query.redirect === 'string' && route.query.redirect
      ? route.query.redirect
      : '/me';
  }

  if (route.name === 'me' && typeof route.query.section === 'string' && route.query.section) {
    return window.history.length > 1 ? null : { name: 'me' };
  }

  if (route.name === 'friend-detail' || route.name === 'edit-friend') {
    return getFriendBackTarget(route);
  }

  if (
    route.name === 'ask-ai'
    || route.name === 'friend-supplement'
    || route.name === 'profile-intake'
    || route.name === 'friend-record-list'
  ) {
    return currentFriendId.value
      ? getFriendDetailRoute(currentFriendId.value, sourcePage, route.query.backTo as string | undefined)
      : getFriendBackTarget(route);
  }

  if (route.name === 'add-friend') {
    return '/friends';
  }

  if (route.name === 'home-occasion-more') {
    return '/home';
  }

  if (route.name === 'home-occasion-detail') {
    return typeof route.query.returnTo === 'string' && route.query.returnTo
      ? route.query.returnTo
      : '/home';
  }

  if (route.name === 'memorial-create' || route.name === 'memorial-edit') {
    return '/calendar';
  }

  return null;
}

async function bindNativeBackButton(): Promise<void> {
  if (!isNativeApp) {
    return;
  }

  const listener = await CapacitorApp.addListener('backButton', async () => {
    const target = getNativeBackTarget();
    if (target) {
      await router.push(target);
      return;
    }

    await CapacitorApp.minimizeApp();
  });

  removeBackButtonListener = () => listener.remove();
}

onMounted(() => {
  void bindNativeBackButton();
});

onUnmounted(() => {
  if (removeBackButtonListener) {
    void removeBackButtonListener();
  }
});
</script>

<style scoped>
.app-stage {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.screen-slide-enter-active,
.screen-slide-leave-active {
  transition: opacity 140ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.screen-slide-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.992);
}

.screen-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(1.004);
}

.floating-switch-enter-active,
.floating-switch-leave-active {
  transition: opacity 140ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.floating-switch-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(18px) scale(0.92);
}

.floating-switch-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(34px) scale(0.82);
}
</style>
