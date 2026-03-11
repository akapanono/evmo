<template>
  <section class="app-screen is-active friends-screen" @click="handleScreenClick">
    <div class="home-content">
      <div class="topbar">
        <div>
          <p class="eyebrow">朋友</p>
          <h1 class="brand-title">朋友档案</h1>
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

      <section class="section-block sort-block">
        <div class="sort-row">
          <label class="sort-field">
            <span>排序方式</span>
            <select v-model="sortMode">
              <option value="name">首字母</option>
              <option value="contact">最常聊</option>
              <option value="viewed">最后浏览</option>
            </select>
          </label>
          <p class="sort-hint">星标朋友会优先显示</p>
        </div>
      </section>

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
            <button
              v-else
              type="button"
              class="star-toggle"
              :class="{ active: friend.isImportant }"
              @click.stop="toggleFriendStar(friend)"
            >
              ★
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Avatar from '@/components/common/Avatar.vue';
import { useFriendsStore } from '@/stores/friends';
import { useSettingsStore } from '@/stores/settings';
import type { Friend } from '@/types/friend';
import { isBirthdayToday } from '@/utils/dateHelpers';

type FriendSortMode = 'name' | 'contact' | 'viewed';

const friendsStore = useFriendsStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const searchQuery = ref('');
const searchResults = ref<Friend[]>([]);
const isSearching = ref(false);
const sortMode = ref<FriendSortMode>('viewed');
const isDeleteMode = ref(false);
const longPressTargetId = ref<string | null>(null);
const starPrioritySnapshot = ref<Record<string, boolean>>({});
let longPressTimer: number | null = null;
let searchTimer: number | null = null;
let longPressStartX = 0;
let longPressStartY = 0;
const LONG_PRESS_DELAY = 460;
const LONG_PRESS_MOVE_LIMIT = 12;
const SEARCH_DEBOUNCE_DELAY = 180;

const displayFriends = computed(() => {
  const baseFriends = isSearching.value && searchQuery.value.trim()
    ? searchResults.value
    : friendsStore.friends;

  return [...baseFriends].sort(compareFriends);
});

onMounted(async () => {
  await friendsStore.loadFriends();
  sortMode.value = settingsStore.settings.friendSortMode;
  captureStarPrioritySnapshot();
});

watch(sortMode, (nextMode) => {
  settingsStore.updateSettings({
    friendSortMode: nextMode,
  });
});

function captureStarPrioritySnapshot(): void {
  starPrioritySnapshot.value = Object.fromEntries(
    friendsStore.friends.map((friend) => [friend.id, friend.isImportant]),
  );
}

function clearSearchTimer(): void {
  if (searchTimer !== null) {
    window.clearTimeout(searchTimer);
    searchTimer = null;
  }
}

function handleSearch(): void {
  const keyword = searchQuery.value.trim();

  if (!keyword) {
    clearSearchTimer();
    isSearching.value = false;
    searchResults.value = [];
    return;
  }

  isSearching.value = true;
  clearSearchTimer();
  searchTimer = window.setTimeout(async () => {
    searchResults.value = await friendsStore.searchFriends(keyword);
    searchTimer = null;
  }, SEARCH_DEBOUNCE_DELAY);
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

function compareFriends(a: Friend, b: Friend): number {
  const aPriority = starPrioritySnapshot.value[a.id] ?? a.isImportant;
  const bPriority = starPrioritySnapshot.value[b.id] ?? b.isImportant;
  if (aPriority !== bPriority) {
    return aPriority ? -1 : 1;
  }

  if (sortMode.value === 'contact') {
    const contactDiff = (b.contactCount ?? 0) - (a.contactCount ?? 0);
    if (contactDiff !== 0) {
      return contactDiff;
    }

    const lastContactDiff = compareDateDesc(a.lastContactDate, b.lastContactDate);
    if (lastContactDiff !== 0) {
      return lastContactDiff;
    }
  }

  if (sortMode.value === 'viewed') {
    const viewedDiff = compareDateDesc(a.lastViewedAt, b.lastViewedAt);
    if (viewedDiff !== 0) {
      return viewedDiff;
    }
  }

  return compareByName(a, b);
}

function compareDateDesc(a?: string, b?: string): number {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  return bTime - aTime;
}

function compareByName(a: Friend, b: Friend): number {
  return a.name.localeCompare(b.name, 'zh-Hans-CN-u-co-pinyin');
}

async function toggleFriendStar(friend: Friend): Promise<void> {
  await friendsStore.updateFriend(friend.id, {
    isImportant: !friend.isImportant,
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
  clearSearchTimer();
  cancelLongPress();
});
</script>

<style scoped>
.friends-screen {
  padding-bottom: 140px;
}

.home-content {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

.brand-title {
  color: #26404a;
  letter-spacing: 0.03em;
  text-shadow: 0 8px 18px rgba(38, 64, 74, 0.06);
}

.sort-block {
  padding: 14px 18px;
}

.sort-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}

.sort-field {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
}

.sort-field select {
  min-width: 144px;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--ink);
  font: inherit;
}

.sort-hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
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

.star-toggle {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  border: 0;
  padding: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.96);
  font-size: 22px;
  line-height: 1;
}

.star-toggle.active {
  color: #e2a329;
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

@media (max-width: 600px) {
  .sort-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
