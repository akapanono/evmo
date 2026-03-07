<template>
  <div :class="['topbar', compact ? 'compact' : '']">
    <button v-if="showBack" class="back-link" type="button" @click="handleBack">
      返回
    </button>
    <div v-if="title" class="topbar-title">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
    </div>
    <div v-else class="topbar-title">
      <slot name="title"></slot>
    </div>
    <slot name="actions"></slot>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

interface Props {
  title?: string;
  eyebrow?: string;
  showBack?: boolean;
  backTo?: string;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
  compact: false,
});

const router = useRouter();

function handleBack(): void {
  if (props.backTo) {
    router.push(props.backTo);
  } else {
    router.back();
  }
}
</script>
