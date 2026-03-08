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
      aria-label="朋友档案应用界面"
    >
      <router-view v-slot="{ Component }">
        <Transition name="screen-slide" mode="out-in" appear>
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </router-view>

      <Transition name="overlay-fade" appear>
        <FloatingButton
          v-if="showAddButton"
          @click="navigateToAdd"
        />
      </Transition>

      <Transition name="overlay-fade" appear>
        <FloatingButton
          v-if="showAskButton"
          :is-ask="true"
          @click="navigateToAsk"
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
import { useRoute, useRouter } from 'vue-router';
import BottomNav from '@/components/layout/BottomNav.vue';
import FloatingButton from '@/components/layout/FloatingButton.vue';

const route = useRoute();
const router = useRouter();
const isNativeApp = Capacitor.isNativePlatform();

const mainTabs = new Set(['/', '/me']);
let removeBackButtonListener: (() => Promise<void>) | null = null;

const showBottomNav = computed(() => mainTabs.has(route.path));
const showAddButton = computed(() => route.path === '/');
const showAskButton = computed(() => route.path.startsWith('/friend/') && !route.path.includes('/ask'));
const showFloatingAction = computed(() => showAddButton.value || showAskButton.value);

function navigateToAdd(): void {
  router.push('/add');
}

function navigateToAsk(): void {
  const friendId = route.path.split('/')[2];
  if (friendId) {
    router.push(`/friend/${friendId}/ask`);
  }
}

async function bindNativeBackButton(): Promise<void> {
  if (!isNativeApp) {
    return;
  }

  const listener = await CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) {
      router.back();
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
  transition: opacity 220ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.screen-slide-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.992);
}

.screen-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(1.004);
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
