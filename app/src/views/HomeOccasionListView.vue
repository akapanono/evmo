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
          <p class="gift-copy">{{ item.suggestion.gifts.join(' / ') }}</p>
        </div>
      </article>

      <p v-if="items.length === 0" class="empty-state">这个时间段还没有即将到来的生日或纪念日。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import { getFriendSourceQuery } from '@/utils/friendNavigation';
import { buildHomeOccasionSections, getReminderRangeMeta, type HomeOccasionItem, type ReminderRangeKey } from '@/utils/homeOccasions';

const router = useRouter();
const route = useRoute();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();

const rangeKey = computed<ReminderRangeKey>(() => {
  const value = route.params.range;
  return value === 'today' || value === 'week' || value === 'month' ? value : 'today';
});

const meta = computed(() => getReminderRangeMeta(rangeKey.value));
const items = computed(() =>
  buildHomeOccasionSections(friendsStore.friends, memorialDaysStore.memorialDays)
    .find((section) => section.key === rangeKey.value)?.items ?? [],
);

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

function openOccasion(item: HomeOccasionItem): void {
  void router.push({
    name: 'home-occasion-detail',
    params: { type: item.type, id: item.targetId },
  });
}
</script>

<style scoped>
.home-list-screen {
  padding: 20px 16px 36px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top right, rgba(215, 167, 111, 0.16), transparent 28%),
    linear-gradient(180deg, #f6efe7 0%, #f1ebe4 100%);
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
  background: rgba(37, 31, 26, 0.08);
  color: #1f1914;
}

.mini-label,
.gift-title,
.summary,
.empty-state {
  margin: 0;
}

.mini-label {
  color: #8c6a53;
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
  color: #1f1a17;
  font-size: 28px;
}

.list-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 251, 247, 0.94);
  box-shadow: 0 16px 40px rgba(84, 56, 28, 0.08);
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
  color: #7a6553;
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
  background: rgba(223, 108, 80, 0.12);
  color: #b85441;
}

.occasion-badge.memorial {
  background: rgba(54, 117, 101, 0.12);
  color: #2d6f61;
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
  background: rgba(255, 232, 204, 0.88);
  color: #35261d;
  font-size: 12px;
}

.list-main h2 {
  color: #241b15;
  font-size: 18px;
}

.summary {
  margin-top: 6px;
  color: #786351;
  font-size: 13px;
}

.gift-block {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 245, 233, 0.98), rgba(251, 239, 226, 0.9));
}

.gift-title {
  color: #8d5c26;
  font-size: 12px;
  font-weight: 700;
}

.gift-copy {
  color: #2b1f17;
  font-size: 15px;
  line-height: 1.6;
}

.empty-state {
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 252, 248, 0.84);
  color: #8a7460;
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
