<template>
  <main class="app-stage">
    <section class="phone-app" aria-label="朋友档案手机界面">
      <StatusBar />

      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>

      <FloatingButton
        :visible="showAddButton"
        @click="navigateToAdd"
      />
      <FloatingButton
        :visible="showAskButton"
        :is-ask="true"
        @click="navigateToAsk"
      />

      <BottomNav v-show="showBottomNav" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StatusBar from '@/components/layout/StatusBar.vue';
import BottomNav from '@/components/layout/BottomNav.vue';
import FloatingButton from '@/components/layout/FloatingButton.vue';

const route = useRoute();
const router = useRouter();

const mainTabs = new Set(['/', '/me']);

const showBottomNav = computed(() => mainTabs.has(route.path));
const showAddButton = computed(() => route.path === '/');
const showAskButton = computed(() => route.path.startsWith('/friend/') && !route.path.includes('/ask'));

function navigateToAdd(): void {
  router.push('/add');
}

function navigateToAsk(): void {
  const friendId = route.path.split('/')[2];
  if (friendId) {
    router.push(`/friend/${friendId}/ask`);
  }
}
</script>

<style scoped>
.app-stage {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
}
</style>
