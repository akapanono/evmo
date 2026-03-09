<template>
  <section class="section-block">
    <div class="section-head">
      <h3>{{ isSearching ? '搜索结果' : '我的朋友' }}</h3>
      <span>{{ friends.length }} 位</span>
    </div>

    <div v-if="friends.length > 0" class="friend-grid">
      <FriendCard v-for="friend in friends" :key="friend.id" :friend="friend" />
    </div>

    <div v-else class="empty-state">
      <p v-if="isSearching && keyword">没有找到与“{{ keyword }}”相关的朋友。</p>
      <p v-else>还没有档案，点击右下角按钮先添加一位。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import FriendCard from './FriendCard.vue';
import type { Friend } from '@/types/friend';

interface Props {
  friends: Friend[];
  isSearching?: boolean;
  keyword?: string;
}

defineProps<Props>();
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
  line-height: 1.6;
}
</style>
