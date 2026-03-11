<template>
  <div :class="['avatar', sizeClass, colorClass, { 'has-image': Boolean(imageSrc) }]">
    <img v-if="imageSrc" :src="imageSrc" alt="" class="avatar-image" />
    <svg v-else-if="preset === 'orbit'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <circle cx="32" cy="32" r="11" class="avatar-mark avatar-fill" />
      <ellipse cx="32" cy="32" rx="24" ry="10" class="avatar-mark avatar-stroke" />
    </svg>
    <svg v-else-if="preset === 'spark'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M32 10 37 24 52 32 37 40 32 54 27 40 12 32 27 24Z" class="avatar-mark avatar-fill" />
    </svg>
    <svg v-else-if="preset === 'bloom'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <circle cx="32" cy="20" r="8" class="avatar-mark avatar-fill" />
      <circle cx="20" cy="32" r="8" class="avatar-mark avatar-fill" />
      <circle cx="44" cy="32" r="8" class="avatar-mark avatar-fill" />
      <circle cx="32" cy="44" r="8" class="avatar-mark avatar-fill" />
      <circle cx="32" cy="32" r="6" class="avatar-mark avatar-core" />
    </svg>
    <svg v-else-if="preset === 'kite'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M32 10 50 32 32 54 14 32Z" class="avatar-mark avatar-fill" />
      <path d="M32 54 26 61" class="avatar-mark avatar-stroke" />
      <path d="M26 61 31 61" class="avatar-mark avatar-stroke" />
    </svg>
    <svg v-else-if="preset === 'wave'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M10 39c7 0 7-10 14-10s7 10 14 10 7-10 14-10 7 10 12 10" class="avatar-mark avatar-stroke" />
      <path d="M10 27c7 0 7-10 14-10s7 10 14 10 7-10 14-10 7 10 12 10" class="avatar-mark avatar-stroke faint" />
    </svg>
    <slot v-else>{{ initial }}</slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AvatarColor, AvatarPreset } from '@/types/friend';

interface Props {
  size?: 'md' | 'xl' | 'xxl';
  color?: AvatarColor;
  initial?: string;
  preset?: AvatarPreset;
  imageSrc?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'coral',
  initial: '',
  preset: 'initial',
  imageSrc: '',
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
