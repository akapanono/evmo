<template>
  <section class="app-screen is-active occasion-detail-screen">
    <div v-if="detail" class="detail-shell">
      <header class="detail-header">
        <button type="button" class="back-button" @click="goBack">返回</button>
        <div class="header-copy">
          <p class="mini-label">{{ detail.type === 'birthday' ? '生日详情' : '纪念日详情' }}</p>
          <h1>{{ detail.title }}</h1>
          <p class="sub-copy">{{ detail.dateLabel }} · {{ detail.relativeLabel }}</p>
        </div>
      </header>

      <section class="overview-card">
        <div class="overview-top">
          <div>
            <p class="mini-label">关联朋友</p>
            <div v-if="detail.friends.length > 0" class="friend-row">
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
            <p v-else class="plain-copy">当前还没有关联朋友。</p>
          </div>
          <div class="summary-box">
            <p class="mini-label">推荐摘要</p>
            <ul>
              <li v-for="gift in detail.suggestion.gifts" :key="gift">{{ gift }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="analysis-grid">
        <article class="radar-card">
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
              <p>{{ score.matchedSignals.slice(0, 3).join(' / ') || '根据关系、喜好和稳定信息综合判断。' }}</p>
            </section>
          </div>
        </article>
      </section>

      <section class="bucket-section">
        <div class="card-heading">
          <p class="mini-label">礼物推荐</p>
          <h2>不同预算区间</h2>
        </div>
        <div class="bucket-grid">
          <article v-for="bucket in giftBuckets" :key="bucket.key" class="bucket-card">
            <header class="bucket-header">
              <strong>{{ bucket.label }}</strong>
            </header>
            <div class="bucket-items">
              <a
                v-for="item in bucket.items"
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
      </section>
    </div>

    <div v-else class="empty-panel">
      <button type="button" class="back-button" @click="goBack">返回</button>
      <p>没有找到对应的提醒详情。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import type { Friend } from '@/types/friend';
import type { RecommendationScore } from '@/types/recommendation';
import { getFriendSourceQuery } from '@/utils/friendNavigation';
import { buildHomeOccasionItem, type OccasionType } from '@/utils/homeOccasions';
import {
  buildBirthdayRecommendation,
  buildGiftSuggestionBuckets,
  buildMemorialRecommendation,
  normalizeOccasionRecommendation,
} from '@/utils/occasionRecommendations';

const router = useRouter();
const route = useRoute();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();

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
  if (!detail.value) {
    return {
      gifts: [],
      scoreCards: [] as RecommendationScore[],
      updatedAt: '',
      source: 'system' as const,
    };
  }

  if (detail.value.type === 'birthday') {
    const friend = detail.value.friends[0];
    if (!friend) {
      return {
        gifts: [],
        scoreCards: [] as RecommendationScore[],
        updatedAt: '',
        source: 'system' as const,
      };
    }
    return normalizeOccasionRecommendation(friend.birthdayRecommendation, buildBirthdayRecommendation(friend));
  }

  const memorial = memorialDaysStore.memorialDays.find((item) => item.id === occasionId.value);
  const linkedFriends = memorial?.friendIds
    .map((friendId) => friendsStore.friends.find((friend) => friend.id === friendId))
    .filter((friend): friend is Friend => Boolean(friend)) ?? [];
  if (!memorial) {
    return {
      gifts: [],
      scoreCards: [] as RecommendationScore[],
      updatedAt: '',
      source: 'system' as const,
    };
  }

  return normalizeOccasionRecommendation(memorial.recommendation, buildMemorialRecommendation(memorial, linkedFriends));
});

const radarScores = computed(() => recommendation.value.scoreCards.slice(0, 5));
const giftBuckets = computed(() => buildGiftSuggestionBuckets(recommendation.value.scoreCards));

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
});

function goBack(): void {
  void router.push('/home');
}

function openFriend(friendId: string): void {
  void router.push({
    name: 'friend-detail',
    params: { id: friendId },
    query: getFriendSourceQuery('home'),
  });
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
</script>

<style scoped>
.occasion-detail-screen {
  padding: 20px 16px 36px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(224, 171, 118, 0.16), transparent 30%),
    linear-gradient(180deg, #f5eee6 0%, #f1ebe4 100%);
}

.detail-shell {
  display: grid;
  gap: 16px;
}

.detail-header,
.overview-card,
.radar-card,
.score-card,
.bucket-card,
.empty-panel {
  border-radius: 26px;
  background: rgba(255, 251, 247, 0.94);
  box-shadow: 0 16px 40px rgba(84, 56, 28, 0.08);
}

.detail-header,
.overview-card,
.radar-card,
.score-card,
.bucket-card,
.empty-panel {
  padding: 18px;
}

.detail-header {
  display: grid;
  gap: 14px;
}

.back-button {
  width: 72px;
  height: 38px;
  border: 0;
  border-radius: 16px;
  background: rgba(37, 31, 26, 0.08);
  color: #1f1914;
}

.mini-label,
.plain-copy,
.sub-copy {
  margin: 0;
}

.mini-label {
  color: #8c6a53;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.header-copy h1,
.card-heading h2,
.gift-item h3 {
  margin: 6px 0 0;
  color: #1f1813;
}

.header-copy h1 {
  font-size: 28px;
}

.sub-copy,
.plain-copy,
.score-item p,
.gift-item p {
  color: #735f4f;
  line-height: 1.6;
}

.overview-top {
  display: grid;
  gap: 16px;
}

.friend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.friend-chip {
  min-height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 236, 214, 0.92);
  color: #2a2019;
  font-size: 15px;
  font-weight: 600;
}

.summary-box {
  padding: 14px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 245, 233, 0.98), rgba(251, 239, 226, 0.9));
}

.summary-box ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #2a2018;
  line-height: 1.7;
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
  stroke: rgba(71, 55, 39, 0.14);
  stroke-width: 1;
}

.radar-area {
  fill: rgba(183, 100, 69, 0.2);
  stroke: #b76445;
  stroke-width: 2;
}

.radar-point {
  fill: #b76445;
}

.radar-legend,
.score-list,
.bucket-items {
  display: grid;
  gap: 10px;
}

.legend-item,
.score-item {
  padding: 12px;
  border-radius: 18px;
  background: rgba(246, 239, 231, 0.9);
}

.legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #2a211c;
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
  color: #261d17;
  font-size: 18px;
}

.gift-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(246, 239, 231, 0.9);
  color: inherit;
  text-decoration: none;
}

.gift-item span {
  min-width: 72px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(53, 36, 21, 0.08);
  color: #5f4a39;
  text-align: center;
  font-size: 12px;
}

.empty-panel {
  display: grid;
  gap: 14px;
}

@media (min-width: 960px) {
  .analysis-grid {
    grid-template-columns: 1.05fr 0.95fr;
  }

  .bucket-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-top {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
