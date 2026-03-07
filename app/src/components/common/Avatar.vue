<template>
  <div :class="['avatar', sizeClass, colorClass]">
    <slot>{{ initial }}</slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AvatarColor } from '@/types/friend';

interface Props {
  size?: 'md' | 'xl' | 'xxl';
  color?: AvatarColor;
  initial?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'coral',
  initial: '',
});

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xl':
      return 'xl';
    case 'xxl':
      return 'xxl';
    default:
      return '';
  }
});

const colorClass = computed(() => props.color);
</script>
