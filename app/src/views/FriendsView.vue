<template>
  <section
    ref="screenRef"
    class="app-screen is-active friends-screen"
    @click="handleScreenClick"
    @touchstart.passive="handleTouchStart"
    @touchmove.passive="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <div class="pull-indicator" :class="{ visible: pullDistance > 8 || refreshing }">
      {{ refreshing ? '刷新中...' : pullDistance >= REFRESH_TRIGGER ? '松开刷新' : '下滑刷新' }}
    </div>

    <div class="home-content" :style="contentStyle">
      <div class="topbar">
        <div>
          <p class="eyebrow">朋友</p>
          <h1 class="brand-title">朋友档案</h1>
        </div>
      </div>

      <div class="toolbar-row">
        <div class="search-box friend-search">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索姓名、昵称、关系、偏好或备注"
            @input="handleSearch"
          />
        </div>

        <div class="sort-menu" data-no-press-feedback="true">
          <button
            type="button"
            class="sort-trigger"
            data-no-press-feedback="true"
            @click.stop="toggleSortMenu"
          >
            <span>{{ activeSortLabel }}</span>
            <span class="sort-caret" :class="{ open: sortMenuOpen }">⌄</span>
          </button>

          <div v-if="sortMenuOpen" class="sort-dropdown">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              class="sort-option"
              :class="{ active: sortMode === option.value }"
              data-no-press-feedback="true"
              @click.stop="selectSortMode(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
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
            @pointerleave="handleCardPointerLeave"
          >
            <button
              v-if="isDeleteMode"
              type="button"
              class="home-delete-badge"
              data-no-press-feedback="true"
              @pointerdown.stop.prevent
              @pointerup.stop.prevent
              @pointercancel.stop.prevent
              @click.stop="deleteFriend(friend.id)"
            >
              ×
            </button>
            <button
              v-else
              type="button"
              class="star-toggle"
              :class="{ active: friend.isImportant }"
              data-no-press-feedback="true"
              @pointerdown.stop.prevent
              @pointerup.stop.prevent
              @pointercancel.stop.prevent
              @click.stop="toggleFriendStar(friend)"
            >
              ★
            </button>

            <div class="grid-top">
              <Avatar
                size="xl"
                :color="friend.avatarColor"
                :preset="friend.avatarPreset"
                :image-src="friend.avatarImage"
              >
                {{ friend.name.charAt(0) }}
              </Avatar>
              <span v-if="isFriendBirthdayToday(friend.birthday)" class="mini-chip">今天生日</span>
            </div>

            <h3>{{ friend.name }}</h3>
            <p>{{ friend.relationship || '关系待补充' }}</p>

            <div v-if="friend.preferences.length > 0" class="inline-tags">
              <span v-for="tag in friend.preferences.slice(0, 2)" :key="tag">
                {{ tag }}
              </span>
            </div>
          </article>
        </div>

        <div v-else class="empty-state-card compact-empty">
          <h2 v-if="isSearching && searchQuery.trim()">没有找到匹配的朋友</h2>
          <h2 v-else>还没有朋友档案</h2>
          <p v-if="isSearching && searchQuery.trim()">换个关键词试试，或者补充更多备注和偏好。</p>
          <p v-else>先新增一位朋友，后面问一问和纪念日关联才会更完整。</p>
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

const sortOptions: Array<{ value: FriendSortMode; label: string }> = [
  { value: 'name', label: '首字母' },
  { value: 'contact', label: '最常聊' },
  { value: 'viewed', label: '最后浏览' },
];

const friendsStore = useFriendsStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const searchQuery = ref('');
const searchResults = ref<Friend[]>([]);
const isSearching = ref(false);
const sortMode = ref<FriendSortMode>('viewed');
const sortMenuOpen = ref(false);
const isDeleteMode = ref(false);
const longPressTargetId = ref<string | null>(null);
const starPrioritySnapshot = ref<Record<string, boolean>>({});
const screenRef = ref<HTMLElement | null>(null);
const pullDistance = ref(0);
const refreshing = ref(false);
let longPressTimer: number | null = null;
let searchTimer: number | null = null;
let longPressStartX = 0;
let longPressStartY = 0;
let touchStartY = 0;
let pullActive = false;
const PRESS_FEEDBACK_DELAY = 300;
const LONG_PRESS_DELAY = 320;
const LONG_PRESS_MOVE_LIMIT = 12;
const SEARCH_DEBOUNCE_DELAY = 180;
const REFRESH_TRIGGER = 72;

const contentStyle = computed(() => ({
  transform: pullDistance.value > 0 ? `translateY(${pullDistance.value}px)` : undefined,
  transition: refreshing.value || pullDistance.value === 0 ? 'transform 180ms ease' : undefined,
}));

const activeSortLabel = computed(() => (
  sortOptions.find((option) => option.value === sortMode.value)?.label ?? '排序'
));

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

function toggleSortMenu(): void {
  sortMenuOpen.value = !sortMenuOpen.value;
}

function selectSortMode(mode: FriendSortMode): void {
  sortMode.value = mode;
  sortMenuOpen.value = false;
}

async function refreshFriends(): Promise<void> {
  if (refreshing.value) {
    return;
  }

  refreshing.value = true;
  try {
    await friendsStore.loadFriends();
    if (isSearching.value && searchQuery.value.trim()) {
      searchResults.value = await friendsStore.searchFriends(searchQuery.value.trim());
    }
    captureStarPrioritySnapshot();
  } finally {
    refreshing.value = false;
  }
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
  const target = event.target;
  if (
    isDeleteMode.value
    || !(target instanceof Element)
    || target.closest('[data-no-press-feedback="true"]')
  ) {
    return;
  }

  cancelLongPress();
  longPressTargetId.value = friendId;
  longPressStartX = event.clientX;
  longPressStartY = event.clientY;
  longPressTimer = window.setTimeout(() => {
    longPressTimer = null;
    isDeleteMode.value = true;
  }, LONG_PRESS_DELAY + PRESS_FEEDBACK_DELAY);
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

function handleCardPointerLeave(): void {
  cancelLongPress();
}

async function deleteFriend(friendId: string): Promise<void> {
  await friendsStore.deleteFriend(friendId);

  if (friendsStore.friends.length === 0) {
    isDeleteMode.value = false;
  }
}

function handleScreenClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    sortMenuOpen.value = false;
    if (isDeleteMode.value) {
      isDeleteMode.value = false;
    }
    return;
  }

  if (!target.closest('.sort-menu')) {
    sortMenuOpen.value = false;
  }

  if (!isDeleteMode.value) {
    return;
  }

  if (target.closest('.grid-card') || target.closest('.home-delete-badge')) {
    return;
  }

  isDeleteMode.value = false;
}

function handleTouchStart(event: TouchEvent): void {
  if (screenRef.value?.scrollTop) {
    pullActive = false;
    pullDistance.value = 0;
    return;
  }

  touchStartY = event.touches[0]?.clientY ?? 0;
  pullActive = true;
}

function handleTouchMove(event: TouchEvent): void {
  if (!pullActive || refreshing.value) {
    return;
  }

  const currentY = event.touches[0]?.clientY ?? touchStartY;
  const deltaY = currentY - touchStartY;
  if (deltaY <= 0) {
    pullDistance.value = 0;
    return;
  }

  pullDistance.value = Math.min(96, deltaY * 0.42);
}

async function handleTouchEnd(): Promise<void> {
  if (!pullActive) {
    pullDistance.value = 0;
    return;
  }

  pullActive = false;
  const shouldRefresh = pullDistance.value >= REFRESH_TRIGGER;
  pullDistance.value = 0;

  if (shouldRefresh) {
    await refreshFriends();
  }
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

.pull-indicator {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  opacity: 0;
  transition: height 180ms ease, opacity 180ms ease;
}

.pull-indicator.visible {
  height: 28px;
  opacity: 1;
}

.brand-title {
  color: #26404a;
  letter-spacing: 0.03em;
  text-shadow: 0 8px 18px rgba(38, 64, 74, 0.06);
}

.toolbar-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-top: 18px;
}

.friend-search {
  flex: 1 1 auto;
}

.sort-menu {
  position: relative;
  flex: 0 0 104px;
}

.sort-trigger {
  width: 100%;
  height: 100%;
  min-height: 54px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 14px;
  font-size: 12px;
}

.sort-caret {
  font-size: 14px;
  line-height: 1;
  transition: transform 180ms ease;
}

.sort-caret.open {
  transform: rotate(180deg);
}

.sort-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 4;
  min-width: 112px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 252, 247, 0.98);
  box-shadow: 0 14px 30px rgba(29, 40, 49, 0.12);
  display: grid;
  gap: 4px;
}

.sort-option {
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
}

.sort-option.active {
  background: rgba(29, 40, 49, 0.08);
}

.friend-grid {
  overflow: visible;
}

.grid-card {
  position: relative;
}

.grid-card.is-home-editing {
  animation: home-card-wiggle 100ms ease-in-out infinite alternate;
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
  transform: none !important;
  -webkit-text-stroke: 0.55px rgba(29, 40, 49, 0.16);
}

.star-toggle.active {
  color: #e2a329;
}

.coral-card .star-toggle {
  -webkit-text-stroke-color: rgba(155, 78, 58, 0.42);
}

.teal-card .star-toggle {
  -webkit-text-stroke-color: rgba(33, 95, 89, 0.42);
}

.gold-card .star-toggle {
  -webkit-text-stroke-color: rgba(145, 110, 35, 0.42);
}

.ink-card .star-toggle {
  -webkit-text-stroke-color: rgba(35, 49, 57, 0.42);
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
    transform: rotate(-0.38deg);
  }

  to {
    transform: rotate(0.38deg);
  }
}

@media (max-width: 600px) {
  .toolbar-row {
    gap: 6px;
  }

  .sort-menu {
    flex-basis: 96px;
  }

  .sort-trigger,
  .sort-option {
    font-size: 11px;
  }

  .friend-search input {
    font-size: 14px;
  }

  .friend-search input::placeholder {
    font-size: 12px;
  }
}
</style>
