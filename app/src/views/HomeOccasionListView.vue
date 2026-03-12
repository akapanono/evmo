<template>
  <section class="app-screen is-active home-list-screen">
    <div class="home-list-shell">
      <header class="list-header">
        <button type="button" class="mini-action" @click="goBack">返回</button>
        <div>
          <p class="mini-label">{{ meta.title }}</p>
          <h1>{{ meta.title }}提醒</h1>
        </div>
      </header>

      <article
        v-for="item in items"
        :key="item.id"
        class="list-card"
        @click="openOccasion(item)"
      >
        <div class="list-top">
          <div class="list-meta">
            <span :class="['occasion-badge', item.type]">{{ item.type === 'birthday' ? '生日' : '纪念日' }}</span>
            <span>{{ item.dateLabel }}</span>
            <strong>{{ item.relativeLabel }}</strong>
          </div>
          <div v-if="item.friends.length > 0" class="friend-actions" @click.stop>
            <button
              v-for="friend in item.friends"
              :key="friend.id"
              type="button"
              class="friend-chip"
              @click="openFriend(friend.id)"
            >
              {{ friend.name }}
            </button>
          </div>
        </div>

        <div class="list-main">
          <h2>{{ item.title }}</h2>
          <p class="summary">{{ item.summary }}</p>
        </div>

        <div class="gift-block">
          <p class="gift-title">礼物推荐</p>
          <p class="gift-copy">{{ getGiftPreviewText(item.id, item.suggestion.gifts) }}</p>
        </div>
      </article>

      <p v-if="items.length === 0" class="empty-state">这个时间段还没有即将到来的生日或纪念日。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { recommendationService } from '@/services/recommendationService';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import type { MemorialDay } from '@/types/memorial';
import type { OccasionRecommendation } from '@/types/recommendation';
import { getFriendSourceQuery } from '@/utils/friendNavigation';
import { buildHomeOccasionSections, getReminderRangeMeta, type HomeOccasionItem, type ReminderRangeKey } from '@/utils/homeOccasions';

const router = useRouter();
const route = useRoute();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();
const remoteRecommendations = ref<Record<string, OccasionRecommendation>>({});
const loadedRecommendationIds = ref<Record<string, boolean>>({});
let hydrationRunId = 0;

const rangeKey = computed<ReminderRangeKey>(() => {
  const value = route.params.range;
  return value === 'today' || value === 'week' || value === 'month' ? value : 'today';
});

const meta = computed(() => getReminderRangeMeta(rangeKey.value));
const items = computed(() =>
  buildHomeOccasionSections(friendsStore.friends, memorialDaysStore.memorialDays)
    .find((section) => section.key === rangeKey.value)?.items.map((item) => ({
      ...item,
      suggestion: {
        gifts: remoteRecommendations.value[item.id]?.gifts ?? item.suggestion.gifts ?? [],
      },
    })) ?? [],
);

onMounted(async () => {
  await initializeList();
});

onActivated(async () => {
  await initializeList();
});

watch(rangeKey, async () => {
  remoteRecommendations.value = {};
  await hydrateRemoteRecommendations();
});

watch(
  () => buildHomeOccasionSections(friendsStore.friends, memorialDaysStore.memorialDays)
    .find((section) => section.key === rangeKey.value)?.items.map((item) => item.id).join('|') ?? '',
  async () => {
    await hydrateRemoteRecommendations();
  },
);

async function initializeList(): Promise<void> {
  await Promise.all([
    friendsStore.loadFriends(),
    memorialDaysStore.loadMemorialDays(),
  ]);
  await hydrateRemoteRecommendations();
}

async function hydrateRemoteRecommendations(): Promise<void> {
  const runId = ++hydrationRunId;
  const sourceItems = buildHomeOccasionSections(friendsStore.friends, memorialDaysStore.memorialDays)
    .find((section) => section.key === rangeKey.value)?.items ?? [];
  for (const item of sourceItems) {
    if (runId !== hydrationRunId) {
      return;
    }
    await loadRecommendationForItem(item);
  }
}

async function loadRecommendationForItem(item: HomeOccasionItem): Promise<void> {
  loadedRecommendationIds.value = {
    ...loadedRecommendationIds.value,
    [item.id]: false,
  };
  try {
    if (item.type === 'birthday') {
      const friend = item.friends[0];
      if (!friend) return;
      const recommendation = await requestRecommendationWithRetry(() => recommendationService.buildBirthdayRecommendation(friend));
      remoteRecommendations.value = {
        ...remoteRecommendations.value,
        [item.id]: recommendation,
      };
      friend.birthdayRecommendation = recommendation;
      loadedRecommendationIds.value = {
        ...loadedRecommendationIds.value,
        [item.id]: true,
      };
      return;
    }

    const memorial = memorialDaysStore.memorialDays.find((entry) => entry.id === item.targetId);
    if (!memorial) return;
    const recommendation = await requestRecommendationWithRetry(() =>
      recommendationService.buildMemorialRecommendation(memorial as MemorialDay, item.friends),
    );
    remoteRecommendations.value = {
      ...remoteRecommendations.value,
      [item.id]: recommendation,
    };
    memorial.recommendation = recommendation;
  } catch {
    remoteRecommendations.value = {
      ...remoteRecommendations.value,
      [item.id]: {
        gifts: [],
        scoreCards: [],
        buckets: [],
        updatedAt: '',
        source: 'system',
      },
    };
  } finally {
    loadedRecommendationIds.value = {
      ...loadedRecommendationIds.value,
      [item.id]: true,
    };
  }
}

function isRecommendationLoaded(itemId: string): boolean {
  return loadedRecommendationIds.value[itemId] === true;
}

function getGiftPreviewText(itemId: string, gifts: string[]): string {
  if (gifts.length > 0) {
    return gifts.slice(0, 3).join(' / ');
  }

  return isRecommendationLoaded(itemId) ? '暂无推荐的礼物' : '礼物推荐加载中';
}

async function requestRecommendationWithRetry(
  request: () => Promise<OccasionRecommendation>,
): Promise<OccasionRecommendation> {
  try {
    return await request();
  } catch {
    return request();
  }
}

function goBack(): void {
  void router.push('/home');
}

function openFriend(friendId: string): void {
  void router.push({
    name: 'friend-detail',
    params: { id: friendId },
    query: {
      ...getFriendSourceQuery('home'),
      backTo: route.fullPath,
    },
  });
}

function openOccasion(item: HomeOccasionItem): void {
  void router.push({
    name: 'home-occasion-detail',
    params: { type: item.type, id: item.targetId },
    query: { returnTo: route.fullPath },
  });
}
</script>

<style scoped>
.home-list-screen {
  padding: 20px 16px 36px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--gold) 18%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--body-grad-start) 94%, var(--paper)) 0%, color-mix(in srgb, var(--body-grad-end) 96%, var(--paper)) 100%);
}

.home-list-shell {
  display: grid;
  gap: 16px;
}

.list-header {
  display: grid;
  gap: 12px;
}

.mini-action {
  width: 72px;
  height: 38px;
  border: 0;
  border-radius: 16px;
  background: var(--surface-3);
  color: var(--ink);
}

.mini-label,
.gift-title,
.summary,
.empty-state {
  margin: 0;
}

.mini-label {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.list-header h1,
.list-main h2,
.gift-copy {
  margin: 4px 0 0;
}

.list-header h1 {
  color: var(--ink);
  font-size: 28px;
}

.list-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--card-soft) 96%, transparent);
  box-shadow: 0 16px 40px var(--nav-shadow);
}

.list-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.list-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: var(--muted);
  font-size: 12px;
}

.occasion-badge,
.friend-chip {
  border-radius: 999px;
}

.occasion-badge {
  padding: 4px 10px;
  font-weight: 700;
}

.occasion-badge.birthday {
  background: color-mix(in srgb, var(--coral) 22%, var(--paper));
  color: color-mix(in srgb, var(--coral) 88%, var(--ink));
}

.occasion-badge.memorial {
  background: color-mix(in srgb, var(--teal) 22%, var(--paper));
  color: color-mix(in srgb, var(--teal) 88%, var(--ink));
}

.friend-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.friend-chip {
  padding: 7px 12px;
  border: 0;
  background: linear-gradient(135deg, color-mix(in srgb, var(--teal) 18%, var(--paper)), color-mix(in srgb, var(--gold) 24%, var(--paper)));
  color: color-mix(in srgb, var(--ink) 90%, var(--teal));
  font-size: 12px;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--teal) 18%, transparent),
    0 8px 18px color-mix(in srgb, var(--teal) 10%, transparent);
}

.list-main h2 {
  color: var(--ink);
  font-size: 18px;
}

.summary {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.gift-block {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--paper) 72%, var(--card-accent-gold)), color-mix(in srgb, var(--paper) 54%, var(--card-accent-teal)));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--paper) 62%, transparent);
}

.gift-title {
  color: color-mix(in srgb, var(--gold) 82%, var(--ink));
  font-size: 12px;
  font-weight: 700;
}

.gift-copy {
  color: color-mix(in srgb, var(--ink) 92%, var(--teal));
  font-size: 15px;
  line-height: 1.6;
}

.empty-state {
  padding: 18px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface-panel) 84%, transparent);
  color: var(--muted);
}

@media (max-width: 640px) {
  .list-top {
    display: grid;
  }

  .friend-actions {
    justify-content: flex-start;
  }
}
</style>
