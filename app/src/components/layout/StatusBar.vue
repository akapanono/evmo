<template>
  <header class="status-bar">
    <span>{{ time }}</span>
    <span>友记</span>
    <span>5G 92%</span>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { formatDate } from '@/utils/dateHelpers';

const time = ref('');
let timer: number | null = null;

function updateTime(): void {
  time.value = formatDate(new Date(), 'HH:mm');
}

onMounted(() => {
  updateTime();
  timer = window.setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>
