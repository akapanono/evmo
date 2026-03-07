<template>
  <section class="section-block">
    <div class="section-head">
      <h3>我的朋友</h3>
      <span>{{ friends.length }} 位</span>
    </div>
    <div class="friend-grid">
      <FriendCard v-for="friend in friends" :key="friend.id" :friend="friend" />
    </div>
    <div v-if="friends.length === 0" class="empty-state">
      <p>还没有朋友，点击右下角 + 添加吧</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import FriendCard from './FriendCard.vue';
import type { Friend } from '@/types/friend';

interface Props {
  friends: Friend[];
}

defineProps<Props>();
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
}
</style>
