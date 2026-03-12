<template>
  <section class="app-screen is-active home-dashboard-screen">
    <div class="topbar compact home-topbar">
      <div class="topbar-title">
        <p class="eyebrow">首页提醒</p>
        <h1>生日和纪念日</h1>
      </div>
    </div>

    <section
      v-for="section in previewSections"
      :key="section.key"
      class="reminder-section"
    >
      <header class="section-header">
        <h2>{{ section.title }}</h2>
        <button
          v-if="section.items.length > previewLimit"
          type="button"
          class="ghost-action"
          @click="openMore(section.key)"
        >
          更多
        </button>
      </header>

      <div v-if="section.items.length > 0" class="card-grid">
        <article
          v-for="item in section.items.slice(0, previewLimit)"
          :key="item.id"
          class="occasion-card"
          @click="openOccasion(item)"
        >
          <div class="card-top">
            <span :class="['occasion-tag', item.type]">{{ item.type === 'birthday' ? '生日' : '纪念日' }}</span>
            <span class="date-pill">{{ item.dateLabel }}</span>
            <strong>{{ item.relativeLabel }}</strong>
          </div>

          <div class="card-main">
            <h3>{{ item.title }}</h3>
            <p class="summary">{{ item.summary }}</p>
          </div>

          <div v-if="item.friends.length > 0" class="friend-row" @click.stop>
            <button
              v-for="friend in item.friends.slice(0, 2)"
              :key="friend.id"
              type="button"
              class="friend-chip"
              @click="openFriend(friend.id)"
            >
              {{ friend.name }}
            </button>
          </div>

          <div class="gift-preview">
            <p class="gift-label">礼物推荐</p>
            <ul>
              <li v-for="gift in item.suggestion.gifts.slice(0, 3)" :key="gift">{{ gift }}</li>
            </ul>
          </div>
        </article>
      </div>

      <div v-else class="empty-card">
        这段时间还没有需要特别留意的生日或纪念日。
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import { getFriendSourceQuery } from '@/utils/friendNavigation';
import { buildHomeOccasionSections, type HomeOccasionItem, type ReminderRangeKey } from '@/utils/homeOccasions';

const router = useRouter();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();

const previewLimit = 2;

const previewSections = computed(() =>
  buildHomeOccasionSections(friendsStore.friends, memorialDaysStore.memorialDays),
);

onMounted(async () => {
  await Promise.all([
    friendsStore.loadFriends(),
    memorialDaysStore.loadMemorialDays(),
  ]);
});

function openMore(range: ReminderRangeKey): void {
  void router.push({ name: 'home-occasion-more', params: { range } });
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
.home-dashboard-screen {
  padding: 20px 16px 36px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(232, 188, 132, 0.34), transparent 32%),
    radial-gradient(circle at 92% 10%, rgba(126, 155, 140, 0.22), transparent 24%),
    linear-gradient(180deg, #f8f1e9 0%, #f3ece4 46%, #efe7de 100%);
}

.home-topbar {
  margin-bottom: 22px;
  padding: 20px 18px;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255, 251, 246, 0.96), rgba(248, 236, 220, 0.88)),
    rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(126, 95, 68, 0.08);
  box-shadow: 0 18px 42px rgba(88, 60, 34, 0.08);
}

.eyebrow,
.gift-label,
.summary {
  margin: 0;
}

.eyebrow {
  color: #8b6a52;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-topbar h1,
.section-header h2,
.occasion-card h3 {
  margin: 6px 0 0;
  color: #1e1611;
}

.home-topbar h1 {
  font-size: 32px;
  line-height: 1.14;
}

.reminder-section {
  margin-top: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 0 2px;
}

.section-header h2 {
  margin: 0;
  font-size: 24px;
  color: #241a14;
}

.ghost-action {
  min-width: 72px;
  height: 38px;
  border: 1px solid rgba(36, 32, 28, 0.08);
  border-radius: 999px;
  background: rgba(255, 249, 242, 0.9);
  color: #24201c;
  font-size: 14px;
}

.card-grid {
  display: grid;
  gap: 14px;
}

.occasion-card,
.empty-card {
  border-radius: 28px;
  background: rgba(255, 251, 247, 0.94);
  border: 1px solid rgba(117, 88, 61, 0.06);
  box-shadow: 0 18px 44px rgba(84, 56, 28, 0.08);
}

.occasion-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.occasion-card:active {
  transform: scale(0.99);
}

.card-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: #6e5b4a;
  font-size: 12px;
}

.card-main {
  display: grid;
  gap: 8px;
}

.occasion-tag,
.date-pill,
.friend-chip {
  border-radius: 999px;
}

.occasion-tag {
  padding: 6px 11px;
  font-weight: 700;
}

.occasion-tag.birthday {
  background: rgba(221, 112, 81, 0.12);
  color: #bf5f43;
}

.occasion-tag.memorial {
  background: rgba(75, 125, 110, 0.14);
  color: #316f61;
}

.date-pill {
  padding: 5px 10px;
  background: rgba(64, 43, 21, 0.05);
}

.occasion-card h3 {
  font-size: 21px;
  line-height: 1.3;
}

.summary {
  color: #776152;
  line-height: 1.6;
}

.friend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.friend-chip {
  min-height: 36px;
  padding: 0 16px;
  border: 0;
  background: linear-gradient(180deg, rgba(255, 238, 216, 0.96), rgba(252, 230, 202, 0.92));
  color: #2a2019;
  font-size: 14px;
  box-shadow: inset 0 0 0 1px rgba(186, 146, 109, 0.12);
}

.gift-preview {
  padding: 15px 16px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 245, 230, 0.98), rgba(251, 240, 226, 0.92));
  border: 1px solid rgba(191, 146, 94, 0.08);
}

.gift-label {
  color: #91602c;
  font-size: 12px;
  font-weight: 700;
}

.gift-preview ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #2a2018;
  line-height: 1.7;
}

.empty-card {
  padding: 20px;
  color: #8a7460;
}

@media (min-width: 900px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
