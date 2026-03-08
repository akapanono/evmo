<template>
  <section class="app-screen is-active home-screen">
    <div class="home-content">
      <div class="topbar">
        <div>
          <p class="eyebrow">首页</p>
          <h1>朋友档案</h1>
        </div>
      </div>

      <label class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索姓名、昵称、关系、偏好或备注"
          @input="handleSearch"
        />
      </label>

      <section class="section-block">
        <div class="section-head">
          <h3>{{ isSearching ? '搜索结果' : '我的朋友' }}</h3>
          <span>{{ displayFriends.length }} 位</span>
        </div>

        <div v-if="displayFriends.length > 0" class="friend-grid">
          <article
            v-for="friend in displayFriends"
            :key="friend.id"
            :class="['grid-card', `${friend.avatarColor}-card`]"
            @click="openFriend(friend.id)"
          >
            <div class="grid-top">
              <Avatar size="xl" :color="friend.avatarColor">
                {{ friend.name.charAt(0) }}
              </Avatar>
              <span v-if="isFriendBirthdayToday(friend.birthday)" class="mini-chip">今天生日</span>
            </div>

            <h3>{{ friend.name }}</h3>
            <p>{{ friend.relationship || '未填写关系' }}</p>

            <div v-if="friend.preferences.length > 0" class="inline-tags">
              <span v-for="tag in friend.preferences.slice(0, 2)" :key="tag">
                {{ tag }}
              </span>
            </div>
          </article>
        </div>

        <div v-else class="empty-state-card compact-empty">
          <h2 v-if="isSearching && searchQuery.trim()">没有找到相关朋友</h2>
          <h2 v-else>还没有朋友档案</h2>
          <p v-if="isSearching && searchQuery.trim()">试试换一个关键词，或者检查输入内容。</p>
          <p v-else>点击底部中间的加号，先添加第一位朋友。</p>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Avatar from '@/components/common/Avatar.vue';
import { useFriendsStore } from '@/stores/friends';
import type { Friend } from '@/types/friend';
import { isBirthdayToday } from '@/utils/dateHelpers';

const friendsStore = useFriendsStore();
const router = useRouter();
const searchQuery = ref('');
const searchResults = ref<Friend[]>([]);
const isSearching = ref(false);

const displayFriends = computed(() => {
  if (isSearching.value && searchQuery.value.trim()) {
    return searchResults.value;
  }

  return friendsStore.friends;
});

onMounted(async () => {
  await friendsStore.loadFriends();
});

async function handleSearch(): Promise<void> {
  const keyword = searchQuery.value.trim();

  if (!keyword) {
    isSearching.value = false;
    searchResults.value = [];
    return;
  }

  isSearching.value = true;
  searchResults.value = await friendsStore.searchFriends(keyword);
}

function openFriend(friendId: string): void {
  router.push(`/friend/${friendId}`);
}

function isFriendBirthdayToday(birthday: string | undefined): boolean {
  return birthday ? isBirthdayToday(birthday) : false;
}
</script>

<style scoped>
.home-screen {
  padding-bottom: 140px;
}

.home-content {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

.compact-empty {
  margin-top: 16px;
  padding: 28px 20px;
}

.compact-empty h2 {
  font-size: 24px;
  margin-bottom: 10px;
}

.compact-empty p {
  color: var(--muted);
  line-height: 1.6;
}
</style>
