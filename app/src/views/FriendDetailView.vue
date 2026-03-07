<template>
  <section class="app-screen is-active" v-if="friend">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">朋友详情</p>
        <h1>{{ friend.name }}</h1>
      </div>
      <button class="icon-btn soft" type="button" @click="editFriend">编辑</button>
    </div>

    <article class="hero-profile">
      <Avatar :size="'xxl'" :color="friend.avatarColor">
        {{ friend.name.charAt(0) }}
      </Avatar>
      <h2>{{ friend.name }}</h2>
      <p>
        {{ friend.relationship }}
        <template v-if="friend.birthday">
          · {{ formatBirthday(friend.birthday) }}
        </template>
      </p>
    </article>

    <section class="section-block">
      <div class="section-head">
        <h3>基本信息</h3>
      </div>
      <article class="info-card">
        <InfoRow label="昵称">
          {{ friend.nickname || '-' }}
        </InfoRow>
        <InfoRow label="关系">
          {{ friend.relationship }}
        </InfoRow>
        <InfoRow label="生日">
          {{ friend.birthday ? formatBirthday(friend.birthday) : '-' }}
        </InfoRow>
        <InfoRow label="最近联系">
          {{ friend.lastContactDate ? getRelativeTime(friend.lastContactDate) : '从未' }}
        </InfoRow>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>自定义信息</h3>
      </div>
      <article class="custom-card" v-if="friend.preferences.length > 0">
        <div class="tag-group">
          <span v-for="pref in friend.preferences" :key="pref">{{ pref }}</span>
        </div>
      </article>
      <article class="note-card" v-if="friend.notes">
        <p class="mini-label">最近记录</p>
        <p>{{ friend.notes }}</p>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import Avatar from '@/components/common/Avatar.vue';
import InfoRow from '@/components/friend/InfoRow.vue';
import type { Friend } from '@/types/friend';
import { formatBirthday, getRelativeTime } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();
const friend = ref<Friend | null>(null);

onMounted(async () => {
  await friendsStore.loadFriends();
  const id = route.params.id as string;
  friend.value = friendsStore.friends.find((f) => f.id === id) || null;
});

function goBack(): void {
  router.push('/');
}

function editFriend(): void {
  if (friend.value) {
    router.push(`/edit/${friend.value.id}`);
  }
}
</script>
