<template>
  <section
    ref="screenRef"
    class="app-screen is-active home-dashboard-screen"
    @touchstart.passive="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <div class="pull-indicator" :class="{ active: isPulling || refreshLoading }">
      <span>{{ refreshLoading ? '正在刷新...' : pullHint }}</span>
    </div>

    <div class="topbar">
      <div class="topbar-title">
        <h1>首页</h1>
        <p class="subcopy">最近值得关注的生日、纪念日和礼物建议都在这里。</p>
      </div>
    </div>

    <section class="overview-grid">
      <button
        v-for="section in previewSections"
        :key="section.key"
        type="button"
        class="overview-card"
        @click="openMore(section.key)"
      >
        <div class="overview-card-top">
          <p class="overview-label">{{ section.title }}</p>
          <span :class="['overview-trend', { alert: section.items.length > 0 }]">
            {{ section.items.length > 0 ? '有提醒' : '空白' }}
          </span>
        </div>
        <strong>{{ section.items.length }}</strong>
        <p class="overview-headline">
          {{ section.items[0]?.title || '当前时间段没有生日或纪念日' }}
        </p>
        <span v-if="section.items.length > 0" class="overview-footnote">
          点击查看这个时间段的全部纪念日
        </span>
      </button>
    </section>

    <section v-if="featuredGiftCards.length > 0" class="gift-section">
      <header class="section-header">
        <div>
          <p class="mini-label">礼物推荐</p>
          <h2>最近值得考虑的礼物</h2>
        </div>
        <span class="section-note">{{ refreshLoading ? '更新中' : `${featuredGiftCards.length} 条建议` }}</span>
      </header>

      <div class="gift-card-list">
        <article
          v-for="card in featuredGiftCards"
          :key="card.id"
          class="gift-card"
          @click="openOccasion(card.item)"
        >
          <div class="gift-card-top">
            <span :class="['occasion-tag', card.item.type]">
              {{ card.item.type === 'birthday' ? '生日' : '纪念日' }}
            </span>
            <span class="date-pill">{{ card.item.relativeLabel }}</span>
          </div>

          <h3>{{ card.gift }}</h3>
          <p class="gift-recipient">建议送给：{{ card.recipient }}</p>
          <p class="gift-summary">{{ card.item.title }} · {{ card.item.dateLabel }}</p>
        </article>
      </div>
    </section>

    <section v-else class="empty-card onboarding-card">
      <div class="empty-hero">
        <p class="empty-badge">空白首页</p>
        <h3>你还没有近期纪念日和礼物推荐</h3>
        <p>先添加朋友和纪念日，首页就会自动整理时间提醒和礼物建议。</p>
      </div>
      <div class="empty-metrics">
        <div>
          <strong>{{ friendsStore.friends.length }}</strong>
          <span>位朋友</span>
        </div>
        <div>
          <strong>{{ memorialDaysStore.memorialDays.length }}</strong>
          <span>条纪念日</span>
        </div>
      </div>
      <div class="empty-actions">
        <button type="button" class="action-btn primary" @click="router.push('/friends')">去加朋友</button>
        <button type="button" class="action-btn" @click="router.push('/calendar')">查看日历</button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { recommendationService } from '@/services/recommendationService';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import type { MemorialDay } from '@/types/memorial';
import type { OccasionRecommendation } from '@/types/recommendation';
import { buildHomeOccasionSections, type HomeOccasionItem, type ReminderRangeKey } from '@/utils/homeOccasions';

const router = useRouter();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();

const screenRef = ref<HTMLElement | null>(null);
const remoteRecommendations = ref<Record<string, OccasionRecommendation>>({});
const refreshLoading = ref(false);
const isPulling = ref(false);
const pullDistance = ref(0);
const initialized = ref(false);

let hydrationRunId = 0;
let touchStartY = 0;
let readyToPull = false;

const PULL_START = 28;
const PULL_TRIGGER = 118;
const PULL_MAX = 132;

const previewSections = computed(() =>
  buildHomeOccasionSections(friendsStore.friends, memorialDaysStore.memorialDays).map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      suggestion: {
        gifts: (() => {
          const recommendation = remoteRecommendations.value[item.id];
          return recommendation?.gifts?.length ? recommendation.gifts : item.suggestion.gifts;
        })(),
      },
    })),
  })),
);

const featuredGiftCards = computed(() =>
  previewSections.value
    .flatMap((section) => section.items.slice(0, 2))
    .filter((item) => item.suggestion.gifts.length > 0)
    .slice(0, 4)
    .map((item) => ({
      id: `${item.id}:${item.suggestion.gifts[0]}`,
      item,
      gift: item.suggestion.gifts[0],
      recipient: item.friends.length > 0 ? item.friends.map((friend) => friend.name).join('、') : item.title,
    })),
);

const pullHint = computed(() => (pullDistance.value >= PULL_TRIGGER ? '松手刷新' : '继续下拉刷新'));

onMounted(async () => {
  await initializeDashboard();
});

onActivated(async () => {
  if (!initialized.value) {
    await initializeDashboard();
  }
});

async function initializeDashboard(): Promise<void> {
  refreshLoading.value = true;
  try {
    await Promise.all([friendsStore.loadFriends(), memorialDaysStore.loadMemorialDays()]);
    await hydrateRemoteRecommendations();
    initialized.value = true;
  } finally {
    refreshLoading.value = false;
  }
}

async function refreshDashboard(): Promise<void> {
  if (refreshLoading.value) return;

  refreshLoading.value = true;
  try {
    await Promise.all([friendsStore.loadFriends(), memorialDaysStore.loadMemorialDays()]);
    await hydrateRemoteRecommendations();
  } finally {
    refreshLoading.value = false;
  }
}

async function hydrateRemoteRecommendations(): Promise<void> {
  const runId = ++hydrationRunId;
  const sections = buildHomeOccasionSections(friendsStore.friends, memorialDaysStore.memorialDays);
  const previewItems = sections.flatMap((section) => section.items.slice(0, 2));

  for (const item of previewItems) {
    if (runId !== hydrationRunId) return;
    await loadRecommendationForItem(item);
  }
}

async function loadRecommendationForItem(item: HomeOccasionItem): Promise<void> {
  try {
    let recommendation: OccasionRecommendation | null = null;

    if (item.type === 'birthday') {
      const friend = item.friends[0];
      if (!friend) return;
      recommendation = await requestRecommendationWithRetry(() => recommendationService.buildBirthdayRecommendation(friend));
      friend.birthdayRecommendation = recommendation;
    } else {
      const memorial = memorialDaysStore.memorialDays.find((entry) => entry.id === item.targetId);
      if (!memorial) return;
      recommendation = await requestRecommendationWithRetry(() =>
        recommendationService.buildMemorialRecommendation(memorial as MemorialDay, item.friends),
      );
      memorial.recommendation = recommendation;
    }

    if (recommendation?.gifts?.length) {
      remoteRecommendations.value = {
        ...remoteRecommendations.value,
        [item.id]: recommendation,
      };
    }
  } catch {
    if (!remoteRecommendations.value[item.id] && item.suggestion.gifts.length > 0) {
      remoteRecommendations.value = {
        ...remoteRecommendations.value,
        [item.id]: {
          gifts: [...item.suggestion.gifts],
          scoreCards: [],
          buckets: [],
          updatedAt: '',
          source: 'system',
        },
      };
    }
  }
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

function handleTouchStart(event: TouchEvent): void {
  touchStartY = event.touches[0]?.clientY ?? 0;
  readyToPull = (screenRef.value?.scrollTop ?? 0) <= 0 && !refreshLoading.value;
  isPulling.value = false;
  pullDistance.value = 0;
}

function handleTouchMove(event: TouchEvent): void {
  if (!readyToPull || refreshLoading.value) return;

  const currentY = event.touches[0]?.clientY ?? touchStartY;
  const delta = currentY - touchStartY;

  if (delta <= PULL_START) {
    isPulling.value = false;
    pullDistance.value = 0;
    return;
  }

  isPulling.value = true;
  pullDistance.value = Math.min(PULL_MAX, (delta - PULL_START) * 0.72);
}

async function handleTouchEnd(): Promise<void> {
  const shouldRefresh = isPulling.value && pullDistance.value >= PULL_TRIGGER;
  isPulling.value = false;
  pullDistance.value = 0;
  readyToPull = false;

  if (shouldRefresh) {
    await refreshDashboard();
  }
}

function openMore(range: ReminderRangeKey): void {
  void router.push({ name: 'home-occasion-more', params: { range } });
}

function openOccasion(item: HomeOccasionItem): void {
  void router.push({
    name: 'home-occasion-detail',
    params: { type: item.type, id: item.targetId },
    query: { returnTo: '/home' },
  });
}
</script>

<style scoped>
.home-dashboard-screen {
  padding: 10px 16px 36px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--gold) 24%, transparent), transparent 32%),
    radial-gradient(circle at 92% 10%, color-mix(in srgb, var(--teal) 16%, transparent), transparent 24%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--body-grad-start) 92%, var(--paper)) 0%,
      color-mix(in srgb, var(--body-grad-end) 96%, var(--paper)) 46%,
      var(--paper) 100%
    );
}

.pull-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  transition: height 180ms ease, opacity 180ms ease;
  opacity: 0;
}

.pull-indicator.active {
  height: 28px;
  opacity: 1;
}

.topbar-title h1,
.section-header h2,
.gift-card h3 {
  margin: 0;
  color: var(--ink);
}

.subcopy,
.mini-label,
.gift-recipient,
.gift-summary,
.empty-badge,
.section-note {
  margin: 0;
}

.subcopy {
  margin-top: 6px;
  color: var(--muted);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.overview-card {
  display: grid;
  gap: 6px;
  min-height: 122px;
  padding: 12px 11px;
  border: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
  border-radius: 24px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--paper) 92%, var(--card-soft)), color-mix(in srgb, var(--surface-panel) 92%, var(--paper)));
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--white-soft) 82%, transparent),
    0 18px 44px var(--nav-shadow);
  text-align: left;
}

.overview-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.overview-label,
.overview-trend,
.overview-footnote,
.section-note,
.overview-headline {
  white-space: nowrap;
}

.overview-label {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.overview-trend {
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, var(--paper));
  color: var(--ink-soft);
  font-size: 9px;
  font-weight: 700;
}

.overview-trend.alert {
  background: color-mix(in srgb, var(--coral) 18%, var(--paper));
  color: color-mix(in srgb, var(--coral) 88%, var(--ink));
}

.overview-card strong {
  font-size: 30px;
  line-height: 1;
  color: var(--ink);
}

.overview-headline {
  min-height: 30px;
  margin: 0;
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-footnote {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gift-section {
  margin-top: 22px;
  display: grid;
  gap: 14px;
}

.section-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}

.section-note {
  color: var(--muted);
  font-size: 12px;
}

.mini-label {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.gift-card-list {
  display: grid;
  gap: 14px;
}

.gift-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 26px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--card-soft) 96%, transparent);
  box-shadow: 0 18px 44px var(--nav-shadow);
}

.gift-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.occasion-tag,
.date-pill {
  border-radius: 999px;
}

.occasion-tag {
  padding: 6px 11px;
  font-size: 12px;
  font-weight: 700;
}

.occasion-tag.birthday {
  background: color-mix(in srgb, var(--coral) 22%, var(--paper));
  color: color-mix(in srgb, var(--coral) 88%, var(--ink));
}

.occasion-tag.memorial {
  background: color-mix(in srgb, var(--teal) 22%, var(--paper));
  color: color-mix(in srgb, var(--teal) 88%, var(--ink));
}

.date-pill {
  padding: 5px 10px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12px;
}

.gift-card h3 {
  font-size: 22px;
  line-height: 1.25;
}

.gift-recipient {
  color: var(--ink-soft);
  font-weight: 600;
}

.gift-summary {
  color: var(--muted);
  line-height: 1.6;
}

.empty-card {
  margin-top: 22px;
  display: grid;
  gap: 18px;
  padding: 24px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--gold) 20%, transparent), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--paper) 86%, var(--card-accent-gold)), color-mix(in srgb, var(--paper) 92%, var(--card-accent-teal)));
  border: 1px solid var(--line);
  box-shadow: 0 18px 44px var(--nav-shadow);
}

.empty-hero {
  display: grid;
  gap: 8px;
}

.empty-badge {
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, var(--paper));
  color: var(--ink-soft);
  font-size: 12px;
}

.empty-hero h3 {
  margin: 0;
  font-size: 24px;
  color: var(--ink);
}

.empty-hero p:last-child {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.empty-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.empty-metrics div {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--paper) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
}

.empty-metrics strong {
  font-size: 28px;
  color: var(--ink);
}

.empty-metrics span {
  color: var(--muted);
  font-size: 13px;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (min-width: 900px) {
  .gift-card-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .overview-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .overview-card {
    min-height: 114px;
    padding: 11px 9px;
    border-radius: 22px;
    gap: 6px;
  }

  .overview-card strong {
    font-size: 24px;
  }

  .overview-headline {
    min-height: 28px;
    font-size: 10px;
  }

  .overview-footnote,
  .overview-trend,
  .overview-label {
    font-size: 9px;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
