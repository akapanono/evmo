<template>
  <button
    v-if="visible"
    :class="buttonClass"
    type="button"
    @click="handleClick"
  >
    <slot>
      <span v-if="variant === 'ask'">问问我</span>
      <span v-else-if="variant === 'trash'" class="floating-trash-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M9 3.75h6l.7 1.75H20a.75.75 0 0 1 0 1.5h-1.04l-.64 10.13A2.25 2.25 0 0 1 16.08 19H7.92a2.25 2.25 0 0 1-2.24-1.87L5.04 7H4a.75.75 0 0 1 0-1.5h4.3L9 3.75Zm-2.45 3.25.61 9.96c.03.38.35.67.76.67h8.16c.4 0 .73-.29.76-.67L17.45 7H6.55Zm3.2 2.25c.41 0 .75.34.75.75v4.5a.75.75 0 0 1-1.5 0V10c0-.41.34-.75.75-.75Zm4.5 0c.41 0 .75.34.75.75v4.5a.75.75 0 0 1-1.5 0V10c0-.41.34-.75.75-.75Z" />
        </svg>
      </span>
      <span v-else>+</span>
    </slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  visible?: boolean;
  variant?: 'add' | 'ask' | 'trash';
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  variant: 'add',
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const buttonClass = computed(() => [
  props.variant === 'ask' ? 'floating-ask' : 'floating-add',
  {
    'is-trash': props.variant === 'trash',
  },
]);

function handleClick(): void {
  emit('click');
}
</script>

<style scoped>
.floating-trash-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.floating-trash-icon svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}
</style>
