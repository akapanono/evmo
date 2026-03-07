<template>
  <span :class="tagClass">
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  muted?: boolean;
  chip?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  muted: false,
  chip: false,
});

const tagClass = computed(() => {
  const classes: string[] = [];
  if (props.muted) classes.push('muted');
  if (props.chip) classes.push('chip');
  return classes.join(' ');
});
</script>
