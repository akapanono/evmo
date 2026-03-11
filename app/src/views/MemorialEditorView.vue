<template>
  <section class="app-screen is-active memorial-screen">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">纪念日</p>
        <h1>{{ isEdit ? '编辑纪念日' : '新建纪念日' }}</h1>
      </div>
    </div>

    <article class="form-card soft-panel">
      <div class="field-grid">
        <label class="field">
          <span>名称</span>
          <input v-model="draft.name" type="text" placeholder="例如：第一次见面、在一起纪念日、合作周年" />
        </label>

        <label class="field">
          <span>日期</span>
          <input v-model="draft.monthDay" type="text" placeholder="MM-DD，例如 03-11" />
        </label>

        <label class="field">
          <span>备注</span>
          <textarea v-model="draft.note" rows="4" placeholder="可选，例如：适合送花、提前订餐、每年要记得联系" />
        </label>
      </div>
    </article>

    <article class="form-card">
      <div class="section-inline-head">
        <div>
          <p class="mini-label">关联朋友</p>
          <h3>{{ selectedFriends.length > 0 ? `${selectedFriends.length} 位已关联` : '未关联朋友' }}</h3>
        </div>
        <button type="button" class="action-btn" @click="openFriendSheet">选择关联朋友</button>
      </div>

      <div v-if="selectedFriends.length > 0" class="selected-friends">
        <span v-for="friend in selectedFriends" :key="friend.id">{{ friend.name }}</span>
      </div>
      <p v-else class="field-hint">可以不关联朋友，也可以后续再补。</p>
    </article>

    <p v-if="message" class="success-message">{{ message }}</p>
    <p v-if="error" class="error-message">{{ error }}</p>

    <div class="sticky-actions">
      <button type="button" class="action-btn" @click="goBack">取消</button>
      <button v-if="isEdit" type="button" class="action-btn danger" @click="removeMemorial" :disabled="saving">
        删除
      </button>
      <button type="button" class="action-btn primary" @click="saveMemorial" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>

    <Transition name="sheet-fade">
      <div v-if="showFriendSheet" class="sheet-overlay" @click="closeFriendSheet">
        <div class="friend-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <div class="section-inline-head sheet-head">
            <div>
              <p class="mini-label">关联朋友</p>
              <h3>从朋友列表中选择</h3>
            </div>
            <button type="button" class="mini-action" @click="closeFriendSheet">完成</button>
          </div>

          <div class="search-box sheet-search">
            <input v-model="friendQuery" type="text" placeholder="搜索姓名、昵称或关系" />
          </div>

          <div v-if="filteredFriends.length > 0" class="friend-option-list">
            <button
              v-for="friend in filteredFriends"
              :key="friend.id"
              type="button"
              class="friend-option"
              @click="toggleFriend(friend.id)"
            >
              <span :class="['friend-check', { checked: draft.friendIds.includes(friend.id) }]"></span>
              <span class="friend-option-main">
                <strong>{{ friend.name }}</strong>
                <small>{{ friend.relationship || '朋友' }}</small>
              </span>
            </button>
          </div>
          <p v-else class="field-hint">没有匹配的朋友。</p>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import { normalizeMonthDay } from '@/services/memorialDayService';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();

const saving = ref(false);
const message = ref('');
const error = ref('');
const showFriendSheet = ref(false);
const friendQuery = ref('');
const draft = ref({
  name: '',
  monthDay: '',
  note: '',
  friendIds: [] as string[],
});

const isEdit = computed(() => typeof route.params.id === 'string' && Boolean(route.params.id));
const memorialId = computed(() => typeof route.params.id === 'string' ? route.params.id : '');

const filteredFriends = computed(() => {
  const keyword = friendQuery.value.trim().toLowerCase();
  if (!keyword) {
    return friendsStore.friends;
  }

  return friendsStore.friends.filter((friend) =>
    [friend.name, friend.nickname ?? '', friend.relationship]
      .join(' ')
      .toLowerCase()
      .includes(keyword),
  );
});

const selectedFriends = computed(() =>
  friendsStore.friends.filter((friend) => draft.value.friendIds.includes(friend.id)),
);

onMounted(async () => {
  await Promise.all([
    friendsStore.loadFriends(),
    memorialDaysStore.loadMemorialDays(),
  ]);

  if (isEdit.value) {
    const target = memorialDaysStore.memorialDays.find((item) => item.id === memorialId.value);
    if (!target) {
      error.value = '没有找到要编辑的纪念日。';
      return;
    }

    draft.value = {
      name: target.name,
      monthDay: target.monthDay,
      note: target.note ?? '',
      friendIds: [...target.friendIds],
    };
    return;
  }

  const queryMonthDay = typeof route.query.monthDay === 'string' ? route.query.monthDay : '';
  draft.value.monthDay = normalizeMonthDay(queryMonthDay) ?? normalizeMonthDay(`${new Date().getMonth() + 1}-${new Date().getDate()}`) ?? '';
});

function goBack(): void {
  router.push('/calendar');
}

function openFriendSheet(): void {
  friendQuery.value = '';
  showFriendSheet.value = true;
}

function closeFriendSheet(): void {
  showFriendSheet.value = false;
}

function toggleFriend(friendId: string): void {
  const current = new Set(draft.value.friendIds);
  if (current.has(friendId)) {
    current.delete(friendId);
  } else {
    current.add(friendId);
  }
  draft.value.friendIds = Array.from(current);
}

async function saveMemorial(): Promise<void> {
  message.value = '';
  error.value = '';
  saving.value = true;

  try {
    const monthDay = normalizeMonthDay(draft.value.monthDay);
    if (!monthDay) {
      throw new Error('日期需要使用 MM-DD 格式。');
    }

    const payload = {
      name: draft.value.name,
      monthDay,
      note: draft.value.note,
      friendIds: draft.value.friendIds,
    };

    if (isEdit.value) {
      await memorialDaysStore.updateMemorialDay(memorialId.value, payload);
    } else {
      await memorialDaysStore.createMemorialDay(payload);
    }

    router.push('/calendar');
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

async function removeMemorial(): Promise<void> {
  if (!isEdit.value) {
    return;
  }

  saving.value = true;
  error.value = '';
  try {
    await memorialDaysStore.deleteMemorialDay(memorialId.value);
    router.push('/calendar');
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.memorial-screen {
  padding-bottom: 120px;
}

.section-inline-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.selected-friends {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.selected-friends span {
  font-size: 12px;
  color: var(--muted);
  background: rgba(29, 40, 49, 0.05);
  border-radius: 999px;
  padding: 8px 12px;
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 28, 0.24);
  display: flex;
  align-items: flex-end;
  z-index: 20;
}

.friend-sheet {
  width: 100%;
  max-height: min(70vh, 620px);
  border-radius: 28px 28px 0 0;
  background: #fffaf5;
  padding: 12px 18px calc(24px + var(--safe-area-bottom));
  display: grid;
  gap: 12px;
  box-shadow: 0 -12px 30px rgba(29, 40, 49, 0.14);
}

.sheet-handle {
  width: 48px;
  height: 5px;
  border-radius: 999px;
  background: rgba(29, 40, 49, 0.14);
  justify-self: center;
}

.sheet-head {
  align-items: flex-start;
}

.mini-action {
  border: 0;
  background: rgba(29, 40, 49, 0.08);
  color: var(--ink);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
}

.sheet-search {
  margin: 0;
}

.friend-option-list {
  display: grid;
  gap: 8px;
  overflow-y: auto;
}

.friend-option {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
  padding: 14px 16px;
  text-align: left;
}

.friend-check {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 1.5px solid rgba(29, 40, 49, 0.22);
  background: #fff;
  flex: 0 0 auto;
}

.friend-check.checked {
  border-color: var(--ink);
  background: var(--ink);
  box-shadow: inset 0 0 0 5px #fff;
}

.friend-option-main {
  display: grid;
  gap: 4px;
}

.friend-option-main small {
  color: var(--muted);
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 180ms ease;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}
</style>
