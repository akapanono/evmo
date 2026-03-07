<template>
  <div class="info-row">
    <strong>{{ label }}</strong>
    <span><slot></slot></span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
}

defineProps<Props>();
</script>
