<template>
  <section class="app-screen is-active calendar-screen">
    <div class="home-content">
      <div class="topbar">
        <div>
          <p class="eyebrow">日历</p>
          <h1 class="brand-title">重要事件历</h1>
        </div>
      </div>

      <section class="section-block">
        <article class="calendar-card soft-panel">
          <div class="calendar-header">
            <h2 class="calendar-month-title">{{ monthTitle }}</h2>
            <div class="calendar-nav">
              <button type="button" class="mini-action" @click="shiftMonth(-1)">上月</button>
              <button type="button" class="mini-action solid" @click="jumpToToday">今天</button>
              <button type="button" class="mini-action" @click="shiftMonth(1)">下月</button>
            </div>
          </div>

          <div
            class="calendar-shell"
            @touchstart.passive="handleCalendarTouchStart"
            @touchend="handleCalendarTouchEnd"
            @touchcancel="handleCalendarTouchEnd"
          >
            <div class="weekday-row">
              <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
            </div>

            <Transition :name="monthTransitionName" mode="out-in">
              <div :key="monthKey" class="calendar-grid">
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
                    },
                  ]"
                  :disabled="!cell.inMonth"
                  @click="cell.inMonth && selectDay(cell.monthDay)"
                >
                  <span class="day-number">{{ cell.day || '' }}</span>
                  <span class="event-line birthday-line">{{ cell.birthdayLabel || '' }}</span>
                  <span class="event-line memorial-line">{{ cell.memorialLabel || '' }}</span>
                </button>
              </div>
            </Transition>
          </div>
        </article>

        <Transition name="day-panel-drop">
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
              <div class="section-inline-head day-group-head">
                <p class="mini-label">生日</p>
                <span class="day-summary">{{ selectedDay.birthdays.length }} 位</span>
              </div>
              <button
                v-for="entry in selectedDay.birthdays"
                :key="entry.id"
                type="button"
                class="day-link-card"
                @click="openFriend(entry.id)"
              >
                <strong>{{ entry.name }}</strong>
                <span>{{ entry.relationship || '朋友' }}</span>
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
              <p v-else class="field-hint">这一天还没有单独记录的纪念日。</p>
            </div>
          </article>
        </Transition>
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
import { getFriendSourceQuery } from '@/utils/friendNavigation';

type CalendarCell = {
  key: string;
  day: number;
  inMonth: boolean;
  monthDay: string;
  isToday: boolean;
  birthdayLabel: string;
  memorialLabel: string;
};

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();
const router = useRouter();
const today = new Date();
const currentMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1));
const selectedMonthDay = ref('');
const monthTransitionName = ref<'month-slide-next' | 'month-slide-prev'>('month-slide-next');
let calendarTouchStartX = 0;
let calendarTouchStartY = 0;
const MONTH_SWIPE_THRESHOLD = 56;
const MONTH_SWIPE_VERTICAL_LIMIT = 48;

const monthKey = computed(() => `${currentMonth.value.getFullYear()}-${currentMonth.value.getMonth() + 1}`);
const monthTitle = computed(() => `${currentMonth.value.getFullYear()} 年 ${currentMonth.value.getMonth() + 1} 月`);

const calendarDays = computed<CalendarCell[]>(() => {
  const firstDay = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const lastDay = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0);
  const leading = (firstDay.getDay() + 6) % 7;
  const total = leading + lastDay.getDate();
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < leading; i += 1) {
    cells.push({
      key: `placeholder-start-${i}`,
      day: 0,
      inMonth: false,
      monthDay: '',
      isToday: false,
      birthdayLabel: '',
      memorialLabel: '',
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), day);
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const birthdayCount = friendsStore.friends.filter((friend) => friend.birthday === monthDay).length;
    const memorialCount = memorialDaysStore.getByMonthDay(monthDay).length;

    cells.push({
      key: monthDay,
      day,
      inMonth: true,
      monthDay,
      isToday: normalizeMonthDay(monthDay) === normalizeMonthDay(`${today.getMonth() + 1}-${today.getDate()}`),
      birthdayLabel: birthdayCount > 1 ? `生日+${birthdayCount}` : birthdayCount === 1 ? '生日' : '',
      memorialLabel: memorialCount > 1 ? `纪念日+${memorialCount}` : memorialCount === 1 ? '纪念日' : '',
    });
  }

  for (let i = 0; i < trailing; i += 1) {
    cells.push({
      key: `placeholder-end-${i}`,
      day: 0,
      inMonth: false,
      monthDay: '',
      isToday: false,
      birthdayLabel: '',
      memorialLabel: '',
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
});

watch(currentMonth, () => {
  const currentMonthPrefix = `${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}-`;
  if (selectedMonthDay.value && !selectedMonthDay.value.startsWith(currentMonthPrefix)) {
    selectedMonthDay.value = '';
  }
});

function shiftMonth(offset: number): void {
  monthTransitionName.value = offset > 0 ? 'month-slide-next' : 'month-slide-prev';
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1);
}

function jumpToToday(): void {
  const targetMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  monthTransitionName.value = targetMonth.getTime() >= currentMonth.value.getTime()
    ? 'month-slide-next'
    : 'month-slide-prev';
  currentMonth.value = targetMonth;
  selectedMonthDay.value = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function selectDay(monthDay: string): void {
  selectedMonthDay.value = selectedMonthDay.value === monthDay ? '' : monthDay;
}

function handleCalendarTouchStart(event: TouchEvent): void {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }

  calendarTouchStartX = touch.clientX;
  calendarTouchStartY = touch.clientY;
}

function handleCalendarTouchEnd(event: TouchEvent): void {
  const touch = event.changedTouches[0];
  if (!touch) {
    return;
  }

  const deltaX = touch.clientX - calendarTouchStartX;
  const deltaY = touch.clientY - calendarTouchStartY;

  if (Math.abs(deltaX) < MONTH_SWIPE_THRESHOLD || Math.abs(deltaY) > MONTH_SWIPE_VERTICAL_LIMIT) {
    return;
  }

  shiftMonth(deltaX < 0 ? 1 : -1);
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
    query: getFriendSourceQuery('calendar'),
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

.section-block {
  position: relative;
}

.calendar-card.soft-panel {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  padding: 0;
  position: relative;
  z-index: 3;
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

.calendar-month-title {
  font-size: 24px;
  line-height: 1.1;
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

.calendar-shell {
  border: 1.5px solid rgba(38, 64, 74, 0.22);
  border-radius: 24px;
  overflow: hidden;
  background: rgba(238, 227, 214, 0.92);
  box-shadow: inset 0 0 0 1px rgba(255, 252, 247, 0.65);
}

.weekday-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.weekday-row {
  border-bottom: 1px solid rgba(38, 64, 74, 0.12);
  background: rgba(221, 207, 191, 0.68);
}

.weekday-row span {
  padding: 10px 0;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}

.weekday-row span + span {
  border-left: 1px solid rgba(38, 64, 74, 0.08);
}

.calendar-cell {
  min-height: 68px;
  border: 0;
  border-right: 1px solid rgba(38, 64, 74, 0.08);
  border-bottom: 1px solid rgba(38, 64, 74, 0.08);
  border-radius: 0;
  background: rgba(255, 252, 247, 0.72);
  padding: 6px 5px;
  display: grid;
  grid-template-rows: auto 16px 16px;
  gap: 2px;
  text-align: left;
  position: relative;
}

.calendar-cell:nth-child(7n) {
  border-right: 0;
}

.calendar-grid .calendar-cell:nth-last-child(7) {
  border-bottom-left-radius: 24px;
}

.calendar-grid .calendar-cell:nth-last-child(1) {
  border-bottom-right-radius: 24px;
}

.calendar-cell.is-placeholder {
  background: rgba(241, 232, 220, 0.82);
}

.calendar-cell.is-selected {
  background: rgba(255, 244, 234, 0.96);
}

.calendar-cell.is-selected::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1.5px solid rgba(29, 40, 49, 0.55);
  border-radius: inherit;
  pointer-events: none;
}

.calendar-grid .calendar-cell:nth-last-child(7),
.calendar-grid .calendar-cell:nth-last-child(1) {
  border-bottom: 0;
}


.calendar-cell.is-today .day-number {
  color: var(--coral);
}

.day-number {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.event-line {
  display: block;
  min-width: 0;
  font-size: 9px;
  line-height: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.birthday-line {
  color: #b84545;
}

.memorial-line {
  color: #26404a;
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

.field-hint {
  font-size: 13px;
  color: var(--muted);
}

.month-slide-next-enter-active,
.month-slide-next-leave-active,
.month-slide-prev-enter-active,
.month-slide-prev-leave-active {
  transition: opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.day-panel-drop-enter-active,
.day-panel-drop-leave-active {
  transition: opacity 220ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1), max-height 240ms ease;
  overflow: hidden;
  transform-origin: top center;
}

.day-panel-drop-enter-from,
.day-panel-drop-leave-to {
  opacity: 0;
  transform: translateY(-22px);
  max-height: 0;
}

.day-panel-drop-enter-to,
.day-panel-drop-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 720px;
}

.day-panel-drop-enter-active {
  position: relative;
  z-index: 1;
}

.day-panel-drop-leave-active {
  position: relative;
  z-index: 0;
}

.day-panel {
  position: relative;
  z-index: 1;
  margin-top: -8px;
  padding-top: 22px;
}

.month-slide-next-enter-from,
.month-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

.month-slide-next-leave-to,
.month-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-18px);
}

@media (max-width: 560px) {
  .section-inline-head,
  .day-group-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .calendar-month-title {
    font-size: 22px;
  }

  .calendar-nav {
    flex: 0 0 auto;
  }

  .calendar-cell {
    min-height: 62px;
    padding: 5px 4px;
    grid-template-rows: auto 15px 15px;
  }

  .day-number {
    font-size: 12px;
  }

  .event-line {
    font-size: 8px;
    line-height: 15px;
  }

  .memorial-item {
    display: grid;
  }
}
</style>
