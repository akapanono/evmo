<template>
  <header class="status-bar">
    <span>{{ time }}</span>
    <span>朋友档案</span>
    <span>5G 92%</span>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const time = ref('');
let timer: number | null = null;

function updateTime(): void {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  time.value = `${hours}:${minutes}`;
}

onMounted(() => {
  updateTime();
  timer = window.setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>
