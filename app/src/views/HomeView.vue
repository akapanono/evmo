<template>
  <section class="app-screen is-active home-screen" @click="handleScreenClick">
    <div class="home-content">
      <div class="topbar">
        <div>
          <p class="eyebrow">首页</p>
          <h1 class="brand-title">记得我</h1>
        </div>
      </div>

      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索姓名、昵称、关系、偏好或备注"
          @input="handleSearch"
        />
      </div>

      <section class="section-block">
        <div class="section-head">
          <h3>{{ isSearching ? '搜索结果' : '我的朋友' }}</h3>
          <span>{{ displayFriends.length }} 位</span>
        </div>

        <div v-if="displayFriends.length > 0" class="friend-grid">
          <article
            v-for="friend in displayFriends"
            :key="friend.id"
            :class="[
              'grid-card',
              `${friend.avatarColor}-card`,
              {
                'is-home-editing': isDeleteMode,
              },
            ]"
            @click="openFriend(friend.id)"
            @pointerdown="handleCardPointerDown(friend.id, $event)"
            @pointerup="cancelLongPress"
            @pointercancel="cancelLongPress"
            @pointermove="handleCardPointerMove"
          >
            <button
              v-if="isDeleteMode"
              type="button"
              class="home-delete-badge"
              @click.stop="deleteFriend(friend.id)"
            >
              ×
            </button>
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
          <h2 v-else>还没有档案</h2>
          <p v-if="isSearching && searchQuery.trim()">试试换一个关键词，或者检查输入内容。</p>
          <p v-else>点击底部中间的加号，先添加第一位朋友。</p>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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
const isDeleteMode = ref(false);
const longPressTargetId = ref<string | null>(null);
let longPressTimer: number | null = null;
let longPressStartX = 0;
let longPressStartY = 0;
const LONG_PRESS_DELAY = 460;
const LONG_PRESS_MOVE_LIMIT = 12;

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
  if (isDeleteMode.value) {
    return;
  }

  router.push({
    name: 'friend-detail',
    params: { id: friendId },
  });
}

function isFriendBirthdayToday(birthday: string | undefined): boolean {
  return birthday ? isBirthdayToday(birthday) : false;
}

function clearLongPressTimer(): void {
  if (longPressTimer !== null) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function cancelLongPress(): void {
  clearLongPressTimer();
  longPressTargetId.value = null;
}

function handleCardPointerDown(friendId: string, event: PointerEvent): void {
  if (isDeleteMode.value) {
    return;
  }

  cancelLongPress();
  longPressTargetId.value = friendId;
  longPressStartX = event.clientX;
  longPressStartY = event.clientY;
  longPressTimer = window.setTimeout(() => {
    longPressTimer = null;
    isDeleteMode.value = true;
  }, LONG_PRESS_DELAY);
}

function handleCardPointerMove(event: PointerEvent): void {
  if (!longPressTargetId.value || longPressTimer === null) {
    return;
  }

  const movedX = Math.abs(event.clientX - longPressStartX);
  const movedY = Math.abs(event.clientY - longPressStartY);
  if (movedX > LONG_PRESS_MOVE_LIMIT || movedY > LONG_PRESS_MOVE_LIMIT) {
    cancelLongPress();
  }
}

async function deleteFriend(friendId: string): Promise<void> {
  await friendsStore.deleteFriend(friendId);

  if (friendsStore.friends.length === 0) {
    isDeleteMode.value = false;
  }
}

function handleScreenClick(event: MouseEvent): void {
  if (!isDeleteMode.value) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    isDeleteMode.value = false;
    return;
  }

  if (target.closest('.grid-card') || target.closest('.home-delete-badge')) {
    return;
  }

  isDeleteMode.value = false;
}

onBeforeUnmount(() => {
  cancelLongPress();
});
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

.home-content > .search-box {
  width: 100%;
  margin: 0;
}

.brand-title {
  color: #26404a;
  letter-spacing: 0.03em;
  text-shadow: 0 8px 18px rgba(38, 64, 74, 0.06);
}

.friend-grid {
  overflow: visible;
}

.grid-card {
  position: relative;
}

.grid-card.is-home-editing {
  animation: home-card-wiggle 220ms ease-in-out infinite alternate;
}

.home-delete-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 2;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: #d65f5f;
  color: #fffaf4;
  font-size: 20px;
  line-height: 1;
  box-shadow: 0 10px 18px rgba(214, 95, 95, 0.28);
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

@keyframes home-card-wiggle {
  from {
    transform: rotate(-0.55deg);
  }

  to {
    transform: rotate(0.55deg);
  }
}
</style>
