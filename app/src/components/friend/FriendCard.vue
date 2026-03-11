<template>
  <article :class="['grid-card', `${friend.avatarColor}-card`]" @click="handleClick">
    <div class="grid-top">
      <Avatar
        size="xl"
        :color="friend.avatarColor"
        :preset="friend.avatarPreset"
        :image-src="friend.avatarImage"
      >
        {{ friend.name.charAt(0) }}
      </Avatar>
      <span v-if="birthdayChipVisible" class="mini-chip">今天生日</span>
    </div>

    <h3>{{ friend.name }}</h3>
    <p>{{ friend.relationship || '未填写关系' }}</p>

    <div v-if="friend.preferences.length > 0" class="inline-tags">
      <span v-for="tag in friend.preferences.slice(0, 2)" :key="tag">
        {{ tag }}
      </span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Avatar from '@/components/common/Avatar.vue';
import type { Friend } from '@/types/friend';
import { isBirthdayToday as checkBirthdayToday } from '@/utils/dateHelpers';

interface Props {
  friend: Friend;
}

const props = defineProps<Props>();
const router = useRouter();

const birthdayChipVisible = computed(() => (
  props.friend.birthday ? checkBirthdayToday(props.friend.birthday) : false
));

function handleClick(): void {
  router.push(`/friend/${props.friend.id}`);
}
</script>

