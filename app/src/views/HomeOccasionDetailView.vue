<template>
  <section class="app-screen is-active occasion-detail-screen">
    <div v-if="detail" class="detail-shell">
      <button type="button" class="back-button standalone-back" @click="goBack">返回</button>

      <section class="memorial-summary-card">
        <div class="summary-column">
          <p class="mini-label">{{ detail.type === 'birthday' ? '生日信息' : '纪念日信息' }}</p>
          <h2>{{ detail.title }}</h2>
          <p class="plain-copy">{{ detail.summary }}</p>
        </div>
        <div class="summary-column is-meta">
          <div class="meta-stack meta-stack-wide">
            <div class="meta-pill">
              <span>关联朋友</span>
              <div v-if="detail.friends.length > 0" class="meta-friends">
                <button
                  v-for="friend in detail.friends"
                  :key="friend.id"
                  type="button"
                  class="friend-chip"
                  @click="openFriend(friend.id)"
                >
                  {{ friend.name }}
                </button>
              </div>
              <strong v-else>暂无</strong>
            </div>
          </div>
          <div class="meta-stack">
            <div class="meta-pill">
              <span>日期</span>
              <strong>{{ detail.dateLabel }}</strong>
            </div>
            <div class="meta-pill">
              <span>时间</span>
              <strong>{{ detail.relativeLabel }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="analysis-grid">
        <article v-if="showRadarChart" class="radar-card">
          <div class="card-heading">
            <p class="mini-label">偏好雷达图</p>
            <h2>当前命中的核心维度</h2>
          </div>
          <div class="radar-shell">
            <svg viewBox="0 0 220 220" class="radar-chart" aria-hidden="true">
              <polygon
                v-for="(ring, index) in radarGridPolygons"
                :key="index"
                :points="ring"
                class="radar-grid"
              />
              <line
                v-for="axis in radarAxes"
                :key="axis.key"
                :x1="110"
                y1="110"
                :x2="axis.x"
                :y2="axis.y"
                class="radar-axis"
              />
              <polygon :points="radarValuePolygon" class="radar-area" />
              <circle
                v-for="point in radarValuePoints"
                :key="point.key"
                :cx="point.x"
                :cy="point.y"
                r="4"
                class="radar-point"
              />
            </svg>
          </div>
          <div class="radar-legend">
            <div v-for="score in radarScores" :key="score.key" class="legend-item">
              <strong>{{ score.label }}</strong>
              <span>{{ score.score }}</span>
            </div>
          </div>
        </article>

        <article class="score-card">
          <div class="card-heading">
            <p class="mini-label">推荐依据</p>
            <h2>系统更偏向这样判断</h2>
          </div>
          <div class="score-list">
            <section v-for="score in recommendation.scoreCards" :key="score.key" class="score-item">
              <div class="score-row">
                <strong>{{ score.label }}</strong>
                <span>{{ score.score }}</span>
              </div>
              <p>{{ getScoreSignalText(score) }}</p>
            </section>
          </div>
        </article>
      </section>

      <section class="bucket-section">
        <div class="card-heading">
          <p class="mini-label">礼物推荐</p>
          <h2>不同预算区间</h2>
        </div>
        <div v-if="giftBuckets.length > 0" class="bucket-grid">
          <article v-for="bucket in giftBuckets" :key="bucket.key" class="bucket-card">
            <header class="bucket-header">
              <strong>{{ bucket.label }}</strong>
              <button
                v-if="bucket.items.length > 3"
                type="button"
                class="swap-button"
                @click="rotateBucket(bucket.key)"
              >
                换一批
              </button>
            </header>
            <div class="bucket-items">
              <a
                v-for="item in getVisibleBucketItems(bucket)"
                :key="item.id"
                class="gift-item"
                :href="item.link"
                target="_blank"
                rel="noreferrer"
              >
                <div>
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.reason }}</p>
                </div>
                <span>{{ item.priceLabel }}</span>
              </a>
            </div>
          </article>
        </div>
        <div v-else class="empty-gift-state">暂无推荐的礼物</div>
      </section>
    </div>

    <div v-else class="empty-panel">
      <button type="button" class="back-button" @click="goBack">返回</button>
      <p>没有找到对应的提醒详情。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { recommendationService } from '@/services/recommendationService';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import type { Friend } from '@/types/friend';
import type { OccasionRecommendation, RecommendationScore } from '@/types/recommendation';
import { getFriendSourceQuery } from '@/utils/friendNavigation';
import { buildHomeOccasionItem, type OccasionType } from '@/utils/homeOccasions';

const router = useRouter();
const route = useRoute();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();
const remoteRecommendation = ref<OccasionRecommendation | null>(null);
const bucketSeeds = ref<Record<string, number>>({});
const EMPTY_RECOMMENDATION: OccasionRecommendation = {
  gifts: [],
  scoreCards: [],
  buckets: [],
  updatedAt: '',
  source: 'system',
};

const occasionType = computed<OccasionType | null>(() => {
  const value = route.params.type;
  return value === 'birthday' || value === 'memorial' ? value : null;
});

const occasionId = computed(() => String(route.params.id ?? ''));

const detail = computed(() => {
  if (!occasionType.value || !occasionId.value) {
    return null;
  }

  return buildHomeOccasionItem(
    occasionType.value,
    occasionId.value,
    friendsStore.friends,
    memorialDaysStore.memorialDays,
  );
});

const recommendation = computed(() => {
  if (remoteRecommendation.value) {
    return remoteRecommendation.value;
  }

  return EMPTY_RECOMMENDATION;
});

const radarScores = computed(() => recommendation.value.scoreCards.slice(0, 5));
const showRadarChart = computed(() => radarScores.value.length >= 3);
const giftBuckets = computed(() => recommendation.value.buckets ?? []);

const radarAxes = computed(() => buildRadarAxes(radarScores.value, 84));
const radarGridPolygons = computed(() => [0.25, 0.5, 0.75, 1].map((ratio) => buildRadarPolygon(radarScores.value, ratio * 84)));
const radarValuePoints = computed(() =>
  radarScores.value.map((score, index, array) => {
    const angle = (-Math.PI / 2) + (index / array.length) * Math.PI * 2;
    const radius = 84 * Math.min(score.score, 100) / 100;
    return {
      key: score.key,
      x: 110 + Math.cos(angle) * radius,
      y: 110 + Math.sin(angle) * radius,
    };
  }),
);
const radarValuePolygon = computed(() => radarValuePoints.value.map((point) => `${point.x},${point.y}`).join(' '));

onMounted(async () => {
  await Promise.all([
    friendsStore.loadFriends(),
    memorialDaysStore.loadMemorialDays(),
  ]);
  await hydrateRemoteRecommendation();
});

watch([occasionType, occasionId], async () => {
  remoteRecommendation.value = null;
  bucketSeeds.value = {};
  await hydrateRemoteRecommendation();
});

async function hydrateRemoteRecommendation(): Promise<void> {
  if (!detail.value) return;

  try {
    if (detail.value.type === 'birthday') {
      const friend = detail.value.friends[0];
      if (!friend) return;
      const recommendation = await recommendationService.buildBirthdayRecommendation(friend);
      remoteRecommendation.value = recommendation;
      friend.birthdayRecommendation = recommendation;
      return;
    }

    const memorial = memorialDaysStore.memorialDays.find((item) => item.id === occasionId.value);
    if (!memorial) return;
    const recommendation = await recommendationService.buildMemorialRecommendation(memorial, detail.value.friends);
    remoteRecommendation.value = recommendation;
    memorial.recommendation = recommendation;
  } catch {
    remoteRecommendation.value = EMPTY_RECOMMENDATION;
  }
}

function goBack(): void {
  void router.push(typeof route.query.returnTo === 'string' && route.query.returnTo ? route.query.returnTo : '/home');
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

function rotateBucket(bucketKey: string): void {
  bucketSeeds.value = {
    ...bucketSeeds.value,
    [bucketKey]: Date.now() + Math.floor(Math.random() * 1000),
  };
}

function getVisibleBucketItems(bucket: NonNullable<OccasionRecommendation['buckets']>[number]) {
  return selectBatch(bucket.items, 3, bucketSeeds.value[bucket.key] ?? 0, bucket.key);
}

function getScoreSignalText(score: RecommendationScore): string {
  const cleaned = (score.matchedSignals ?? [])
    .map((item) => sanitizeMatchedSignal(item))
    .filter(Boolean)
    .slice(0, 3);

  return cleaned.join(' / ') || '根据关系、喜好和稳定信息综合判断。';
}

function buildRadarAxes(scores: RecommendationScore[], radius: number): Array<{ key: string; x: number; y: number }> {
  return scores.map((score, index, array) => {
    const angle = (-Math.PI / 2) + (index / array.length) * Math.PI * 2;
    return {
      key: score.key,
      x: 110 + Math.cos(angle) * radius,
      y: 110 + Math.sin(angle) * radius,
    };
  });
}

function buildRadarPolygon(scores: RecommendationScore[], radius: number): string {
  return scores
    .map((_, index, array) => {
      const angle = (-Math.PI / 2) + (index / array.length) * Math.PI * 2;
      const x = 110 + Math.cos(angle) * radius;
      const y = 110 + Math.sin(angle) * radius;
      return `${x},${y}`;
    })
    .join(' ');
}

function selectBatch<T extends { id?: string } | string>(
  items: T[],
  size: number,
  seed: number,
  salt: string,
): T[] {
  if (!Array.isArray(items) || items.length <= size) {
    return Array.isArray(items) ? items : [];
  }

  return [...items]
    .map((item, index) => {
      const raw = typeof item === 'string' ? item : (item.id || `${salt}-${index}`);
      return {
        item,
        weight: hashSeed(`${salt}-${seed}-${raw}`),
      };
    })
    .sort((a, b) => a.weight - b.weight)
    .slice(0, size)
    .map((entry) => entry.item);
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function sanitizeMatchedSignal(value: string): string {
  return String(value || '')
    .replace(/\b(food|entertainment|life|social|travel|shopping|ritual|other)\b\s*/gi, '')
    .replace(/\b[a-z]{2,}\b\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
</script>

<style scoped>
.occasion-detail-screen {
  padding: 20px 16px 36px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--gold) 18%, transparent), transparent 30%),
    linear-gradient(180deg, color-mix(in srgb, var(--body-grad-start) 94%, var(--paper)) 0%, color-mix(in srgb, var(--body-grad-end) 96%, var(--paper)) 100%);
}

.detail-shell {
  display: grid;
  gap: 16px;
}

.birthday-summary-card,
.memorial-summary-card,
.radar-card,
.score-card,
.bucket-card,
.empty-panel {
  border-radius: 26px;
  background: color-mix(in srgb, var(--card-soft) 96%, transparent);
  box-shadow: 0 16px 40px var(--nav-shadow);
}

.birthday-summary-card,
.memorial-summary-card,
.radar-card,
.score-card,
.bucket-card,
.empty-panel {
  padding: 18px;
}

.standalone-back {
  margin-bottom: 4px;
}

.birthday-summary-card,
.memorial-summary-card {
  display: grid;
  gap: 14px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--paper) 80%, var(--card-accent-gold)), color-mix(in srgb, var(--paper) 62%, var(--card-accent-teal)));
  border: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
}

.back-button {
  width: 72px;
  height: 38px;
  border: 0;
  border-radius: 16px;
  background: var(--surface-3);
  color: var(--ink);
}

.mini-label,
.plain-copy,
.sub-copy {
  margin: 0;
}

.mini-label {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-heading h2,
.gift-item h3 {
  margin: 6px 0 0;
  color: var(--ink);
}

.sub-copy,
.plain-copy,
.score-item p,
.gift-item p {
  color: var(--muted);
  line-height: 1.6;
}

.friend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.friend-chip {
  min-height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--teal) 18%, var(--paper)), color-mix(in srgb, var(--gold) 24%, var(--paper)));
  color: color-mix(in srgb, var(--ink) 90%, var(--teal));
  font-size: 15px;
  font-weight: 600;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--teal) 18%, transparent),
    0 8px 18px color-mix(in srgb, var(--teal) 10%, transparent);
}

.bucket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.memorial-summary-card {
  padding: 16px 20px;
}

.memorial-summary-card {
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  align-items: stretch;
}

.summary-column {
  display: grid;
  gap: 8px;
  align-content: start;
}

.summary-column h2 {
  margin: 0;
  color: var(--ink);
  font-size: 24px;
}

.summary-column.is-meta {
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 12px;
  align-content: start;
}

.meta-friends {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-stack-wide .meta-pill {
  align-content: start;
}

.meta-stack-wide .friend-chip {
  min-height: 34px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
}

.meta-pill {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-panel) 92%, var(--paper));
  border: 1px solid color-mix(in srgb, var(--line) 74%, transparent);
}

.meta-pill span {
  color: var(--muted);
  font-size: 12px;
}

.meta-pill strong {
  color: var(--ink);
  font-size: 16px;
}

.meta-stack {
  display: grid;
  gap: 10px;
}

.meta-stack-wide {
  min-width: 0;
}

.analysis-grid,
.bucket-grid {
  display: grid;
  gap: 16px;
}

.radar-shell {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}

.radar-chart {
  width: 220px;
  height: 220px;
}

.radar-grid,
.radar-axis {
  fill: none;
  stroke: color-mix(in srgb, var(--ink) 16%, transparent);
  stroke-width: 1;
}

.radar-area {
  fill: color-mix(in srgb, var(--coral) 22%, transparent);
  stroke: var(--coral);
  stroke-width: 2;
}

.radar-point {
  fill: var(--coral);
}

.radar-legend,
.score-list,
.bucket-items {
  display: grid;
  gap: 10px;
}

.score-list {
  margin-top: 20px;
}

.legend-item,
.score-item {
  padding: 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface-panel) 88%, var(--paper)), color-mix(in srgb, var(--surface-2) 42%, var(--paper)));
  border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
}

.legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--ink);
}

.score-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bucket-section {
  display: grid;
  gap: 14px;
}

.bucket-card {
  display: grid;
  gap: 12px;
}

.bucket-header strong {
  color: var(--ink);
  font-size: 18px;
}

.swap-button {
  min-width: 72px;
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-3) 88%, var(--paper));
  color: var(--ink);
  font-size: 12px;
}

.gift-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface-panel) 88%, var(--paper)), color-mix(in srgb, var(--surface-2) 42%, var(--paper)));
  color: inherit;
  text-decoration: none;
  border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
}

.gift-item span {
  min-width: 72px;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--gold) 16%, var(--paper));
  color: color-mix(in srgb, var(--gold) 74%, var(--ink));
  text-align: center;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.empty-panel {
  display: grid;
  gap: 14px;
}

.empty-gift-state {
  padding: 18px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-panel) 88%, var(--paper));
  color: var(--muted);
}

@media (min-width: 960px) {
  .analysis-grid {
    grid-template-columns: 1.05fr 0.95fr;
  }

  .bucket-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .header-main {
    align-items: center;
  }
}

@media (max-width: 720px) {
  .memorial-summary-card {
    grid-template-columns: 1fr;
  }

  .summary-column.is-meta {
    grid-template-columns: 1fr;
  }
}
</style>
