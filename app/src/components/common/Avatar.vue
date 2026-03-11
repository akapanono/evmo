<template>
  <div :class="['avatar', sizeClass, colorClass, { 'has-image': Boolean(imageSrc) }]">
    <img v-if="imageSrc" :src="imageSrc" alt="" class="avatar-image" />
    <svg v-else-if="preset === 'orbit'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <circle cx="32" cy="32" r="11" class="avatar-mark avatar-fill" />
      <ellipse cx="32" cy="32" rx="24" ry="10" class="avatar-mark avatar-stroke" />
    </svg>
    <svg v-else-if="preset === 'wave'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M10 39c7 0 7-10 14-10s7 10 14 10 7-10 14-10 7 10 12 10" class="avatar-mark avatar-stroke" />
      <path d="M10 27c7 0 7-10 14-10s7 10 14 10 7-10 14-10 7 10 12 10" class="avatar-mark avatar-stroke faint" />
    </svg>
    <svg v-else-if="preset === 'ring'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <circle cx="32" cy="32" r="17" class="avatar-mark avatar-stroke" />
      <circle cx="32" cy="32" r="6" class="avatar-mark avatar-fill" />
    </svg>
    <svg v-else-if="preset === 'tile'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <rect x="12" y="12" width="16" height="16" rx="4" class="avatar-mark avatar-fill" />
      <rect x="36" y="12" width="16" height="16" rx="4" class="avatar-mark avatar-fill soft" />
      <rect x="12" y="36" width="16" height="16" rx="4" class="avatar-mark avatar-fill soft" />
      <rect x="36" y="36" width="16" height="16" rx="4" class="avatar-mark avatar-fill" />
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
    <svg v-else-if="preset === 'comet'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <circle cx="42" cy="22" r="8" class="avatar-mark avatar-fill" />
      <path d="M18 46c6-2 12-8 18-16" class="avatar-mark avatar-stroke" />
      <path d="M12 50c7-1 14-7 21-15" class="avatar-mark avatar-stroke faint" />
    </svg>
    <svg v-else-if="preset === 'crown'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M14 46 20 20 32 32 44 20 50 46Z" class="avatar-mark avatar-fill" />
      <path d="M14 46h36" class="avatar-mark avatar-stroke" />
    </svg>
    <svg v-else-if="preset === 'cat'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M18 24 24 12 30 22" class="avatar-mark avatar-stroke" />
      <path d="M46 24 40 12 34 22" class="avatar-mark avatar-stroke" />
      <circle cx="32" cy="36" r="16" class="avatar-mark avatar-fill soft" />
      <circle cx="26" cy="34" r="2" class="avatar-mark avatar-core" />
      <circle cx="38" cy="34" r="2" class="avatar-mark avatar-core" />
      <path d="M28 42c2 2 6 2 8 0" class="avatar-mark avatar-stroke" />
      <path d="M20 39h8M36 39h8M20 44h7M37 44h7" class="avatar-mark avatar-stroke faint" />
    </svg>
    <svg v-else-if="preset === 'rabbit'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <rect x="21" y="8" width="8" height="22" rx="4" class="avatar-mark avatar-fill soft" />
      <rect x="35" y="8" width="8" height="22" rx="4" class="avatar-mark avatar-fill soft" />
      <circle cx="32" cy="38" r="16" class="avatar-mark avatar-fill" />
      <circle cx="26" cy="36" r="2" class="avatar-mark avatar-core" />
      <circle cx="38" cy="36" r="2" class="avatar-mark avatar-core" />
      <circle cx="32" cy="42" r="3" class="avatar-mark avatar-core" />
      <path d="M29 46c1.5 1.2 4.5 1.2 6 0" class="avatar-mark avatar-stroke" />
    </svg>
    <svg v-else-if="preset === 'leaf'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M17 40c0-13 11-22 28-22 0 14-8 28-22 28-4 0-6-2-6-6Z" class="avatar-mark avatar-fill" />
      <path d="M23 42c6-8 12-14 22-20" class="avatar-mark avatar-stroke" />
    </svg>
    <svg v-else-if="preset === 'flower'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <ellipse cx="32" cy="18" rx="7" ry="10" class="avatar-mark avatar-fill soft" />
      <ellipse cx="18" cy="32" rx="10" ry="7" class="avatar-mark avatar-fill soft" />
      <ellipse cx="46" cy="32" rx="10" ry="7" class="avatar-mark avatar-fill soft" />
      <ellipse cx="32" cy="46" rx="7" ry="10" class="avatar-mark avatar-fill soft" />
      <ellipse cx="22" cy="22" rx="7" ry="9" transform="rotate(-35 22 22)" class="avatar-mark avatar-fill" />
      <ellipse cx="42" cy="22" rx="7" ry="9" transform="rotate(35 42 22)" class="avatar-mark avatar-fill" />
      <circle cx="32" cy="32" r="7" class="avatar-mark avatar-core" />
    </svg>
    <svg v-else-if="preset === 'cherry'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M32 20c2-5 7-8 12-8M32 20c-2-5-7-8-12-8" class="avatar-mark avatar-stroke" />
      <path d="M32 22 24 34M32 22 40 34" class="avatar-mark avatar-stroke faint" />
      <circle cx="22" cy="40" r="8" class="avatar-mark avatar-fill" />
      <circle cx="42" cy="40" r="8" class="avatar-mark avatar-fill soft" />
    </svg>
    <svg v-else-if="preset === 'citrus'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <circle cx="32" cy="32" r="18" class="avatar-mark avatar-fill soft" />
      <circle cx="32" cy="32" r="13" class="avatar-mark avatar-stroke" />
      <path d="M32 19v26M19 32h26M23 23l18 18M41 23 23 41" class="avatar-mark avatar-stroke faint" />
    </svg>
    <svg v-else-if="preset === 'pig'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <circle cx="32" cy="34" r="16" class="avatar-mark avatar-fill soft" />
      <path d="M20 24 16 16 24 20M44 24l4-8-8 4" class="avatar-mark avatar-stroke" />
      <ellipse cx="32" cy="39" rx="9" ry="6" class="avatar-mark avatar-fill" />
      <circle cx="28" cy="39" r="1.8" class="avatar-mark avatar-core" />
      <circle cx="36" cy="39" r="1.8" class="avatar-mark avatar-core" />
      <circle cx="26" cy="32" r="2" class="avatar-mark avatar-core" />
      <circle cx="38" cy="32" r="2" class="avatar-mark avatar-core" />
    </svg>
    <svg v-else-if="preset === 'cow'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <rect x="18" y="20" width="28" height="24" rx="10" class="avatar-mark avatar-fill" />
      <path d="M18 24 12 18M46 24l6-6" class="avatar-mark avatar-stroke" />
      <path d="M22 24c4 4 8 4 12 0 4 4 8 4 12 0" class="avatar-mark avatar-stroke faint" />
      <circle cx="27" cy="33" r="2" class="avatar-mark avatar-core" />
      <circle cx="37" cy="33" r="2" class="avatar-mark avatar-core" />
      <rect x="24" y="36" width="16" height="8" rx="4" class="avatar-mark avatar-fill soft" />
    </svg>
    <svg v-else-if="preset === 'panda'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <circle cx="22" cy="20" r="6" class="avatar-mark avatar-fill faint" />
      <circle cx="42" cy="20" r="6" class="avatar-mark avatar-fill faint" />
      <circle cx="32" cy="34" r="16" class="avatar-mark avatar-fill" />
      <ellipse cx="25" cy="33" rx="5" ry="7" class="avatar-mark avatar-core" />
      <ellipse cx="39" cy="33" rx="5" ry="7" class="avatar-mark avatar-core" />
      <circle cx="28" cy="33" r="1.6" class="avatar-mark avatar-fill" />
      <circle cx="36" cy="33" r="1.6" class="avatar-mark avatar-fill" />
      <circle cx="32" cy="40" r="3" class="avatar-mark avatar-core" />
    </svg>
    <svg v-else-if="preset === 'sprout'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M32 50V28" class="avatar-mark avatar-stroke" />
      <path d="M32 28c-2-8-9-12-16-12 0 9 6 16 15 16" class="avatar-mark avatar-fill soft" />
      <path d="M32 28c2-8 9-12 16-12 0 9-6 16-15 16" class="avatar-mark avatar-fill" />
    </svg>
    <svg v-else-if="preset === 'tulip'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M32 50V32" class="avatar-mark avatar-stroke" />
      <path d="M20 32c0-9 5-14 12-18 7 4 12 9 12 18-5-1-8-4-12-8-4 4-7 7-12 8Z" class="avatar-mark avatar-fill" />
      <path d="M26 40c2-2 4-4 6-8 2 4 4 6 6 8" class="avatar-mark avatar-stroke faint" />
    </svg>
    <svg v-else-if="preset === 'pear'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M36 16c0 5-2 8-5 10-6 3-11 10-11 16 0 8 6 14 12 14s12-6 12-14c0-6-5-13-11-16-1-1 3-4 3-10" class="avatar-mark avatar-fill soft" />
      <path d="M34 14c4 0 7 1 9 4" class="avatar-mark avatar-stroke" />
      <path d="M32 20c2-3 4-5 7-6" class="avatar-mark avatar-stroke faint" />
    </svg>
    <svg v-else-if="preset === 'carrot'" viewBox="0 0 64 64" class="avatar-graphic" aria-hidden="true">
      <path d="M34 16c5 1 10 4 12 9-5 0-9-2-12-6" class="avatar-mark avatar-fill soft" />
      <path d="M26 18c-5 1-10 5-12 10 5 0 9-2 12-7" class="avatar-mark avatar-fill" />
      <path d="M32 22 22 48c-1 4 2 8 6 8h8c4 0 7-4 6-8L32 22Z" class="avatar-mark avatar-fill" />
      <path d="M28 34h8M26 42h10" class="avatar-mark avatar-stroke faint" />
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
