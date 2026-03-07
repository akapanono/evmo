<template>
  <button :class="buttonClass" :type="type" :disabled="disabled" @click="handleClick">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'soft' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const buttonClass = computed(() => {
  const classes: string[] = [];
  if (props.variant === 'primary') classes.push('primary');
  if (props.variant === 'icon') classes.push('icon-btn');
  if (props.size === 'sm') classes.push('small');
  return classes.join(' ');
});

function handleClick(event: MouseEvent): void {
  if (!props.disabled) {
    emit('click', event);
  }
}
</script>
