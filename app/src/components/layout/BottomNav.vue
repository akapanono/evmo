<template>
  <nav class="bottom-nav" aria-label="底部导航">
    <button
      v-for="item in items"
      :key="item.path"
      :class="['nav-item', { 'is-active': isActive(item.path) }]"
      type="button"
      @click="navigateTo(item.path)"
    >
      <span>{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';

interface NavItem {
  label: string;
  path: string;
}

const items: NavItem[] = [
  { label: '首页', path: '/' },
  { label: '我的', path: '/me' },
];

const router = useRouter();
const route = useRoute();

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
}

function navigateTo(path: string): void {
  router.push(path);
}
</script>
