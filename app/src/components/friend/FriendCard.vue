<template>
  <article
    :class="['grid-card', `${friend.avatarColor}-card`]"
    @click="handleClick"
  >
    <div class="grid-top">
      <Avatar :size="'xl'" :color="friend.avatarColor">
        {{ friend.name.charAt(0) }}
      </Avatar>
      <span v-if="isBirthdayToday" class="mini-chip">今天生日</span>
      <span v-else-if="needsContact" class="mini-chip">提醒</span>
      <span v-else-if="daysSinceContact > 30" class="mini-chip muted">
        {{ daysSinceContact }} 天未联系
      </span>
    </div>
    <h3>{{ friend.name }}</h3>
    <p>{{ friend.relationship }}</p>
    <div class="inline-tags">
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
import { isBirthdayToday, getDaysSince } from '@/utils/date';

interface Props {
  friend: Friend;
}

const props = defineProps<Props>();
const router = useRouter();

const isBirthdayToday = computed(() =>
  props.friend.birthday ? isBirthdayToday(props.friend.birthday) : false
);

const daysSinceContact = computed(() =>
  props.friend.lastContactDate ? getDaysSince(props.friend.lastContactDate) : 0
);

const needsContact = computed(() => daysSinceContact.value >= 30);

function handleClick(): void {
  router.push(`/friend/${props.friend.id}`);
}
</script>
