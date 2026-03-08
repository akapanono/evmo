<template>
  <button
    v-if="visible"
    :class="isAsk ? 'floating-ask' : 'floating-add'"
    type="button"
    @click="handleClick"
  >
    <slot>{{ isAsk ? '问问我' : '+' }}</slot>
  </button>
</template>

<script setup lang="ts">
interface Props {
  visible?: boolean;
  isAsk?: boolean;
}

withDefaults(defineProps<Props>(), {
  visible: true,
  isAsk: false,
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

function handleClick(): void {
  emit('click');
}
</script>
