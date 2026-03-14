<template>
  <section class="app-screen is-active occasion-detail-screen">
    <div v-if="detail" class="detail-shell">
      <button type="button" class="back-button" @click="goBack">返回</button>

      <section class="summary-card">
        <p class="mini-label">{{ detail.type === 'birthday' ? '生日提醒' : '纪念日提醒' }}</p>
        <h1>{{ detail.title }}</h1>
        <p class="plain-copy">{{ detail.summary }}</p>

        <div class="meta-grid">
          <div class="meta-pill">
            <span>日期</span>
            <strong>{{ detail.dateLabel }}</strong>
          </div>
          <div class="meta-pill">
            <span>时间</span>
            <strong>{{ detail.relativeLabel }}</strong>
          </div>
          <div class="meta-pill meta-pill-wide">
            <span>建议送给</span>
            <strong>{{ recipientText }}</strong>
          </div>
        </div>
      </section>

      <section v-if="recommendation.scoreCards.length > 0" class="reason-section">
        <div class="section-head">
          <p class="mini-label">推荐理由</p>
          <h2>为什么会推荐这些礼物</h2>
        </div>
        <article v-for="score in recommendation.scoreCards" :key="score.key" class="reason-card">
          <div class="reason-top">
            <strong>{{ score.label }}</strong>
            <span>{{ score.score }}</span>
          </div>
          <p>{{ getScoreSignalText(score) }}</p>
        </article>
      </section>

      <section class="gift-section">
        <div class="section-head">
          <p class="mini-label">礼物清单</p>
          <h2>当前可用的礼物建议</h2>
        </div>

        <div v-if="visibleGiftBuckets.length > 0" class="bucket-list">
          <article v-for="bucket in visibleGiftBuckets" :key="bucket.key" class="bucket-card">
            <header class="bucket-head">
              <strong>{{ bucket.label }}</strong>
            </header>

            <article
              v-for="item in bucket.items"
              :key="item.id"
              class="gift-item"
              :class="{ clickable: !!item.link }"
              @click="openGift(item.link)"
            >
              <div class="gift-top">
                <h3>{{ item.title }}</h3>
                <p class="gift-price">{{ item.priceLabel }}</p>
              </div>
              <p class="gift-reason">{{ item.reason || '这份礼物会结合关系、场景和预算来做推荐。' }}</p>
            </article>
          </article>
        </div>

        <div v-else class="empty-gift-state">当前还没有可展示的礼物建议。</div>
      </section>
    </div>

    <div v-else class="empty-panel">
      <button type="button" class="back-button" @click="goBack">返回</button>
      <p>没有找到这个纪念日详情。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { recommendationService } from '@/services/recommendationService';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import type { GiftSuggestionBucket, OccasionRecommendation, RecommendationScore } from '@/types/recommendation';
import { buildHomeOccasionItem, type OccasionType } from '@/utils/homeOccasions';

const router = useRouter();
const route = useRoute();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();
const remoteRecommendation = ref<OccasionRecommendation | null>(null);

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

const recommendation = computed(() => remoteRecommendation.value ?? EMPTY_RECOMMENDATION);
const giftBuckets = computed<GiftSuggestionBucket[]>(() => {
  if (recommendation.value.buckets?.length) {
    return recommendation.value.buckets;
  }

  if (!recommendation.value.gifts.length) {
    return [];
  }

  return [
    {
      key: '100to300',
      label: '推荐礼物',
      items: recommendation.value.gifts.map((gift, index) => ({
        id: `${detail.value?.targetId ?? 'gift'}:${index}`,
        title: gift,
        priceLabel: '参考预算待补充',
        link: '',
        reason: '这份建议来自当前纪念日的快速推荐结果。',
      })),
    },
  ];
});

const visibleGiftBuckets = computed<GiftSuggestionBucket[]>(() =>
  giftBuckets.value.map((bucket) => ({
    ...bucket,
    items: bucket.items.slice(0, 3),
  })),
);

const recipientText = computed(() => {
  if (!detail.value) return '--';
  if (detail.value.friends.length > 0) {
    return detail.value.friends.map((friend) => friend.name).join('、');
  }
  return detail.value.title;
});

onMounted(async () => {
  await Promise.all([friendsStore.loadFriends(), memorialDaysStore.loadMemorialDays()]);
  await hydrateRemoteRecommendation();
});

watch([occasionType, occasionId], async () => {
  remoteRecommendation.value = null;
  await hydrateRemoteRecommendation();
});

async function hydrateRemoteRecommendation(): Promise<void> {
  if (!detail.value) return;

  try {
    if (detail.value.type === 'birthday') {
      const friend = detail.value.friends[0];
      if (!friend) return;
      const recommendationValue = await recommendationService.buildBirthdayRecommendation(friend);
      remoteRecommendation.value = recommendationValue;
      friend.birthdayRecommendation = recommendationValue;
      return;
    }

    const memorial = memorialDaysStore.memorialDays.find((item) => item.id === occasionId.value);
    if (!memorial) return;
    const recommendationValue = await recommendationService.buildMemorialRecommendation(memorial, detail.value.friends);
    remoteRecommendation.value = recommendationValue;
    memorial.recommendation = recommendationValue;
  } catch {
    remoteRecommendation.value = EMPTY_RECOMMENDATION;
  }
}

function goBack(): void {
  void router.push(typeof route.query.returnTo === 'string' && route.query.returnTo ? route.query.returnTo : '/home');
}

function openGift(link: string): void {
  if (!link) return;
  window.open(link, '_blank', 'noopener,noreferrer');
}

function getScoreSignalText(score: RecommendationScore): string {
  const signals = (score.matchedSignals ?? []).filter(Boolean);
  if (signals.length > 0) {
    return signals.join('、');
  }

  return '这条推荐会综合关系、偏好和礼物匹配度给出判断。';
}
</script>

<style scoped>
.occasion-detail-screen {
  padding: 20px 16px 36px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--gold) 18%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--body-grad-start) 94%, var(--paper)) 0%, color-mix(in srgb, var(--body-grad-end) 96%, var(--paper)) 100%);
}

.detail-shell {
  display: grid;
  gap: 16px;
}

.back-button {
  width: 72px;
  height: 38px;
  border: 0;
  border-radius: 16px;
  background: var(--surface-3);
  color: var(--ink);
}

.summary-card,
.reason-card,
.bucket-card,
.empty-panel {
  border-radius: 26px;
  background: color-mix(in srgb, var(--card-soft) 96%, transparent);
  border: 1px solid var(--line);
  box-shadow: 0 18px 44px var(--nav-shadow);
}

.summary-card {
  display: grid;
  gap: 14px;
  padding: 22px 18px;
}

.mini-label,
.plain-copy,
.gift-reason,
.gift-price {
  margin: 0;
}

.mini-label {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-card h1,
.section-head h2,
.gift-top h3 {
  margin: 0;
  color: var(--ink);
}

.plain-copy {
  color: var(--muted);
  line-height: 1.7;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.meta-pill {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--paper) 84%, transparent);
}

.meta-pill-wide {
  grid-column: 1 / -1;
}

.meta-pill span {
  color: var(--muted);
  font-size: 13px;
}

.meta-pill strong {
  color: var(--ink);
}

.reason-section,
.gift-section {
  display: grid;
  gap: 12px;
}

.section-head {
  display: grid;
  gap: 4px;
}

.reason-card {
  display: grid;
  gap: 8px;
  padding: 16px;
}

.reason-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.reason-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.bucket-list {
  display: grid;
  gap: 14px;
}

.bucket-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--paper) 96%, var(--card-soft)), color-mix(in srgb, var(--surface-panel) 88%, var(--paper)));
  box-shadow:
    0 18px 38px var(--nav-shadow),
    inset 0 1px 0 color-mix(in srgb, var(--white-soft) 78%, transparent);
}

.bucket-head {
  display: grid;
  gap: 5px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
}

.bucket-head strong {
  color: var(--ink);
  font-size: 16px;
  letter-spacing: 0.03em;
}

.gift-item {
  display: grid;
  gap: 10px;
  padding: 14px 14px 15px;
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--card-accent-gold) 42%, var(--paper)),
      color-mix(in srgb, var(--card-accent-teal) 18%, var(--paper)) 54%,
      color-mix(in srgb, var(--paper) 92%, var(--card-soft))
    );
  border: 1px solid color-mix(in srgb, var(--gold) 38%, var(--line));
  box-shadow:
    0 16px 32px color-mix(in srgb, var(--nav-shadow) 78%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--white-soft) 82%, transparent);
}

.gift-item:first-of-type {
  padding-top: 14px;
}

.gift-item.clickable {
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease;
}

.gift-item.clickable:active {
  transform: translateY(1px) scale(0.985);
  box-shadow:
    0 8px 18px color-mix(in srgb, var(--nav-shadow) 58%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--white-soft) 60%, transparent);
}

.gift-item.clickable:hover {
  border-color: color-mix(in srgb, var(--coral) 42%, var(--line));
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--card-accent-gold) 50%, var(--paper)),
      color-mix(in srgb, var(--card-accent-teal) 24%, var(--paper)) 54%,
      color-mix(in srgb, var(--paper) 94%, var(--card-soft))
    );
  box-shadow:
    0 18px 36px color-mix(in srgb, var(--nav-shadow) 86%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--white-soft) 78%, transparent);
}

.gift-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
}

.gift-price {
  color: color-mix(in srgb, var(--coral) 72%, var(--ink));
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  padding-left: 10px;
}

.gift-reason {
  color: var(--muted);
  line-height: 1.7;
}

.empty-gift-state,
.empty-panel p {
  color: var(--muted);
  line-height: 1.7;
}

.empty-panel {
  display: grid;
  gap: 16px;
  padding: 22px 18px;
}
</style>
