<template>
  <section class="app-screen is-active calendar-screen">
    <div class="home-content">
      <div class="topbar">
        <div>
          <p class="eyebrow">日历</p>
          <h1 class="brand-title">生日 / 纪念日日历</h1>
        </div>
      </div>

      <section class="section-block">
        <article class="calendar-card soft-panel">
          <div class="calendar-header">
            <div>
              <p class="mini-label">本月</p>
              <h2>{{ monthTitle }}</h2>
            </div>
            <div class="calendar-nav">
              <button type="button" class="mini-action" @click="shiftMonth(-1)">上月</button>
              <button type="button" class="mini-action solid" @click="jumpToToday">今天</button>
              <button type="button" class="mini-action" @click="shiftMonth(1)">下月</button>
            </div>
          </div>

          <div class="weekday-row">
            <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
          </div>

          <div class="calendar-grid">
            <button
              v-for="cell in calendarDays"
              :key="cell.key"
              type="button"
              :class="[
                'calendar-cell',
                {
                  'is-placeholder': !cell.inMonth,
                  'is-selected': cell.inMonth && cell.monthDay === selectedMonthDay,
                  'is-today': cell.inMonth && cell.isToday,
                  'has-events': cell.inMonth && cell.items.length > 0,
                },
              ]"
              :disabled="!cell.inMonth"
              @click="cell.inMonth && selectDay(cell.monthDay)"
            >
              <span class="day-number">{{ cell.day }}</span>
              <div v-if="cell.inMonth && cell.items.length > 0" class="cell-items">
                <span v-for="item in cell.items.slice(0, 2)" :key="item.id" :class="['cell-chip', item.kind]">
                  {{ item.label }}
                </span>
                <span v-if="cell.items.length > 2" class="cell-more">+{{ cell.items.length - 2 }}</span>
              </div>
            </button>
          </div>
        </article>

        <article v-if="selectedDay" class="day-panel form-card">
          <div class="section-inline-head">
            <div>
              <p class="mini-label">当天内容</p>
              <h3>{{ selectedDay.label }}</h3>
            </div>
            <button type="button" class="action-btn primary day-add-btn" @click="createMemorialForSelectedDay">
              新建纪念日
            </button>
          </div>

          <div v-if="selectedDay.birthdays.length > 0" class="day-group">
            <p class="mini-label">生日</p>
            <button
              v-for="friend in selectedDay.birthdays"
              :key="friend.id"
              type="button"
              class="day-link-card"
              @click="openFriend(friend.id)"
            >
              <strong>{{ friend.name }}</strong>
              <span>{{ friend.relationship || '朋友' }}</span>
            </button>
          </div>

          <div class="day-group">
            <div class="section-inline-head day-group-head">
              <p class="mini-label">纪念日</p>
              <span class="day-summary">{{ selectedDay.memorials.length }} 条</span>
            </div>

            <div v-if="selectedDay.memorials.length > 0" class="memorial-list">
              <article v-for="item in selectedDay.memorials" :key="item.id" class="memorial-item">
                <div class="memorial-main">
                  <strong>{{ item.name }}</strong>
                  <p v-if="linkedFriends(item).length > 0">
                    关联朋友：{{ linkedFriends(item).map((friend) => friend.name).join('、') }}
                  </p>
                  <p v-else>未关联朋友</p>
                  <p v-if="item.note" class="memorial-note">{{ item.note }}</p>
                </div>
                <div class="record-actions">
                  <button type="button" class="mini-action" @click="editMemorial(item.id)">编辑</button>
                </div>
              </article>
            </div>
            <p v-else class="field-hint">这一天还没有自定义纪念日。</p>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import type { Friend } from '@/types/friend';
import type { MemorialDay } from '@/types/memorial';
import { normalizeMonthDay } from '@/services/memorialDayService';
import { formatMonthDay } from '@/utils/dateHelpers';

type CalendarItem = {
  id: string;
  kind: 'birthday' | 'memorial';
  label: string;
};

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();
const router = useRouter();
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const selectedMonthDay = ref('');

const monthTitle = computed(() => `${currentMonth.value.getFullYear()} 年 ${currentMonth.value.getMonth() + 1} 月`);

const calendarDays = computed(() => {
  const firstDay = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const lastDay = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0);
  const leading = (firstDay.getDay() + 6) % 7;
  const total = leading + lastDay.getDate();
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  const cells: Array<{
    key: string;
    day: number;
    inMonth: boolean;
    monthDay: string;
    isToday: boolean;
    items: CalendarItem[];
  }> = [];

  for (let i = 0; i < leading; i += 1) {
    cells.push({
      key: `placeholder-start-${i}`,
      day: 0,
      inMonth: false,
      monthDay: '',
      isToday: false,
      items: [],
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), day);
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const birthdays = friendsStore.friends
      .filter((friend) => friend.birthday === monthDay)
      .map((friend) => ({ id: `birthday-${friend.id}`, kind: 'birthday' as const, label: `${friend.name} 生日` }));
    const memorials = memorialDaysStore.getByMonthDay(monthDay)
      .map((item) => ({ id: item.id, kind: 'memorial' as const, label: item.name }));

    cells.push({
      key: monthDay,
      day,
      inMonth: true,
      monthDay,
      isToday: normalizeMonthDay(monthDay) === normalizeMonthDay(`${new Date().getMonth() + 1}-${new Date().getDate()}`),
      items: [...birthdays, ...memorials],
    });
  }

  for (let i = 0; i < trailing; i += 1) {
    cells.push({
      key: `placeholder-end-${i}`,
      day: 0,
      inMonth: false,
      monthDay: '',
      isToday: false,
      items: [],
    });
  }

  return cells;
});

const selectedDay = computed(() => {
  const monthDay = selectedMonthDay.value;
  if (!monthDay) {
    return null;
  }

  return {
    monthDay,
    label: formatMonthDay(monthDay),
    birthdays: friendsStore.friends.filter((friend) => friend.birthday === monthDay),
    memorials: memorialDaysStore.getByMonthDay(monthDay),
  };
});

onMounted(async () => {
  await Promise.all([
    friendsStore.loadFriends(),
    memorialDaysStore.loadMemorialDays(),
  ]);
  ensureSelectedDay();
});

watch(currentMonth, () => {
  ensureSelectedDay();
});

function ensureSelectedDay(): void {
  const today = new Date();
  const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentMonthPrefix = `${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}-`;
  if (selectedMonthDay.value.startsWith(currentMonthPrefix)) {
    return;
  }

  selectedMonthDay.value = currentMonthPrefix === todayMonthDay.slice(0, 3)
    ? todayMonthDay
    : `${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}-01`;
}

function shiftMonth(offset: number): void {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1);
}

function jumpToToday(): void {
  const today = new Date();
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedMonthDay.value = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function selectDay(monthDay: string): void {
  selectedMonthDay.value = monthDay;
}

function createMemorialForSelectedDay(): void {
  router.push({
    name: 'memorial-create',
    query: selectedDay.value ? { monthDay: selectedDay.value.monthDay } : {},
  });
}

function editMemorial(id: string): void {
  router.push({
    name: 'memorial-edit',
    params: { id },
  });
}

function linkedFriends(item: MemorialDay): Friend[] {
  return friendsStore.friends.filter((friend) => item.friendIds.includes(friend.id));
}

function openFriend(friendId: string): void {
  router.push({
    name: 'friend-detail',
    params: { id: friendId },
  });
}
</script>

<style scoped>
.calendar-screen {
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

.calendar-card,
.day-panel {
  display: grid;
  gap: 14px;
}

.calendar-header,
.section-inline-head,
.day-group-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.calendar-nav,
.record-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-action {
  border: 0;
  background: rgba(29, 40, 49, 0.08);
  color: var(--ink);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
}

.mini-action.solid {
  background: var(--ink);
  color: #fff;
}

.weekday-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.weekday-row span {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}

.calendar-cell {
  min-height: 88px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
  padding: 10px 8px;
  display: grid;
  align-content: start;
  gap: 8px;
  text-align: left;
}

.calendar-cell.is-placeholder {
  visibility: hidden;
}

.calendar-cell.is-selected {
  border-color: var(--ink);
  box-shadow: 0 10px 22px rgba(38, 64, 74, 0.12);
}

.calendar-cell.is-today .day-number {
  color: var(--coral);
}

.calendar-cell.has-events {
  background: #fffdf8;
}

.day-number {
  font-weight: 700;
}

.cell-items {
  display: grid;
  gap: 4px;
}

.cell-chip,
.cell-more {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-chip.birthday {
  background: rgba(214, 95, 95, 0.12);
  color: #b84545;
}

.cell-chip.memorial {
  background: rgba(38, 64, 74, 0.1);
  color: #26404a;
}

.cell-more {
  color: var(--muted);
  padding: 0;
}

.day-group {
  display: grid;
  gap: 10px;
}

.day-link-card,
.memorial-item {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  padding: 12px 14px;
}

.day-link-card {
  text-align: left;
  display: grid;
  gap: 4px;
}

.day-link-card span,
.memorial-main p,
.day-summary {
  color: var(--muted);
}

.memorial-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.memorial-main {
  display: grid;
  gap: 4px;
}

.day-add-btn {
  flex: 0 0 auto;
}

@media (max-width: 560px) {
  .calendar-cell {
    min-height: 78px;
    padding: 8px 6px;
  }

  .memorial-item {
    display: grid;
  }
}
</style>
