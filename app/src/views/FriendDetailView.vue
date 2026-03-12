<template>
  <section v-if="friend" class="app-screen is-active detail-screen">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">朋友详情</p>
        <h1>{{ friend.name }}</h1>
      </div>
      <button class="icon-btn soft" type="button" @click="editFriend">编辑</button>
    </div>

    <article class="hero-profile">
      <Avatar
        size="xxl"
        :color="friend.avatarColor"
        :preset="friend.avatarPreset"
        :image-src="friend.avatarImage"
      >
        {{ friend.name.charAt(0) }}
      </Avatar>
      <h2>{{ friend.name }}</h2>
      <p>{{ friend.relationship || '未填写关系' }}</p>
    </article>

    <section class="section-block">
      <div class="section-head">
        <h3>常用入口</h3>
      </div>
      <article class="form-card quick-action-card">
        <div class="quick-action-grid">
          <button type="button" class="action-btn primary" @click="openAskAI">问一问</button>
          <button type="button" class="action-btn" @click="openSupplementPage">一句话补充</button>
          <button type="button" class="action-btn" @click="openProfileIntake">画像补充</button>
          <button type="button" class="action-btn" @click="editFriend">编辑档案</button>
        </div>
        <div class="profile-stat-strip">
          <div class="profile-stat">
            <strong>{{ preferenceItems.length }}</strong>
            <span>偏好</span>
          </div>
          <div class="profile-stat">
            <strong>{{ stableFields.length }}</strong>
            <span>补充</span>
          </div>
          <div class="profile-stat">
            <strong>{{ timelineItems.length }}</strong>
            <span>时间线</span>
          </div>
          <div class="profile-stat">
            <strong>{{ linkedMemorialDays.length }}</strong>
            <span>纪念日</span>
          </div>
        </div>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>关联纪念日</h3>
        <button type="button" class="more-link" @click="goToCalendar">去日历管理</button>
      </div>
      <article v-if="linkedMemorialDays.length > 0" class="info-card memorial-preview-card">
        <div v-for="item in linkedMemorialDays" :key="item.id" class="memorial-preview-row">
          <div>
            <strong>{{ item.name }}</strong>
            <p>{{ formatMonthDay(item.monthDay) }} · {{ memorialRelativeText(item.monthDay) }}</p>
          </div>
        </div>
      </article>
      <article v-else class="note-card">
        <p>这个朋友还没有关联纪念日。你可以在日历里给某一天命名并关联到他。</p>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>基础信息</h3>
        <div class="basic-info-head-actions">
          <button
            type="button"
            :class="['delete-link', 'basic-info-action', 'basic-info-edit-toggle', { 'is-active': basicInfoDeleteMode }]"
            @click="toggleBasicInfoDeleteMode"
          >
            {{ showBasicInfoCreator ? '收起' : '新增' }}
          </button>
          <button
            type="button"
            :class="['more-link', 'basic-info-action', 'basic-info-create-toggle', { 'is-active': showBasicInfoCreator }]"
            @click="toggleBasicInfoCreator"
          >
            {{ basicInfoDeleteMode ? '完成' : '删除' }}
          </button>
        </div>
      </div>

      <article class="info-card">
        <div v-if="showBasicInfoCreator" class="record-editor basic-info-editor">
          <input v-model="basicInfoDraft.label" type="text" placeholder="词条名" />
          <input v-model="basicInfoDraft.value" type="text" placeholder="词条内容" />
          <div class="record-editor-actions">
            <button type="button" class="mini-action" @click="resetBasicInfoDraft">取消</button>
            <button
              type="button"
              class="mini-action solid"
              @click="saveNewBasicInfoField"
              :disabled="!basicInfoDraft.label.trim() || !basicInfoDraft.value.trim() || busyBasicInfoId === '__creating__'"
            >
              保存
            </button>
          </div>
        </div>

        <div v-for="row in basicInfoRows" :key="row.id" class="basic-info-row">
          <div class="basic-info-main">
            <strong>{{ row.label }}</strong>
            <span>{{ row.value }}</span>
          </div>
          <button
            v-if="basicInfoDeleteMode && row.deletable"
            type="button"
            class="delete-x"
            @click="removeBasicInfoRow(row)"
            :disabled="busyBasicInfoId === row.id"
          >
            ×
          </button>
        </div>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>补充信息</h3>
        <div class="supplement-head-actions">
          <button type="button" class="more-link" @click="toggleStableDeleteMode">
            {{ stableDeleteMode ? '完成' : '编辑' }}
          </button>
          <button v-if="hasSupplementOverflow" type="button" class="more-link" @click="openRecordList('stable')">更多</button>
        </div>
      </div>

      <article v-if="preferenceGroups.length > 0" class="custom-card">
        <p class="mini-label">喜好</p>
        <div
          v-for="group in preferenceGroups"
          :key="group.category"
          class="preference-column"
        >
          <p class="mini-label">{{ group.label }}</p>
          <div class="tag-group compact-tags compact-tags-preview">
            <div v-for="item in group.items" :key="item.id" class="editable-tag">
            {{ item.value }}
            <button
              v-if="stableDeleteMode"
              type="button"
              class="tag-remove-btn"
              @click="removePreference(item.id)"
              :disabled="busyPreferenceValue === item.id"
            >
              ×
            </button>
            </div>
          </div>
        </div>
      </article>

      <article v-if="stableFields.length > 0" class="info-card custom-fields-card">
        <div v-for="field in stableFields.slice(0, stablePreviewLimit)" :key="field.id" class="custom-field-row">
          <div class="record-row">
            <div class="record-main">
              <div v-if="showStableFieldTitle(field)" class="custom-field-meta">
                <strong>{{ field.label }}</strong>
              </div>
              <span class="clamped-text">{{ field.value }}</span>
            </div>
            <div class="record-actions">
              <button
                v-if="stableDeleteMode"
                type="button"
                class="delete-x"
                @click="removeField(field.id)"
                :disabled="busyFieldId === field.id"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </article>

      <article v-if="preferenceItems.length === 0 && stableFields.length === 0" class="note-card">
        <p>还没有补充信息。</p>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>时间线</h3>
        <div class="supplement-head-actions">
          <button type="button" class="more-link" @click="toggleTimelineDeleteMode">
            {{ timelineDeleteMode ? '完成' : '编辑' }}
          </button>
          <button v-if="timelineItems.length > timelinePreviewLimit" type="button" class="more-link" @click="openRecordList('timeline')">
            更多
          </button>
        </div>
      </div>
      <article v-if="timelineItems.length > 0" class="info-card timeline-card">
        <div v-for="item in timelineItems.slice(0, timelinePreviewLimit)" :key="item.id" class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-top-row">
              <div class="timeline-meta timeline-meta-top">
                <strong>事件</strong>
                <span>{{ formatDate(item.createdAt, 'MM-dd HH:mm') }}</span>
              </div>
            </div>
            <div class="timeline-value-row">
              <p>{{ item.value }}</p>
            </div>
            <div class="timeline-tags">
              <span v-if="item.eventTimeText">{{ item.eventTimeText }}</span>
              <div class="record-actions timeline-actions">
                <button
                  v-if="timelineDeleteMode"
                  type="button"
                  class="delete-x"
                  @click="removeField(item.id)"
                  :disabled="busyFieldId === item.id"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
      <article v-else class="note-card">
        <p>当前还没有时间线记录。</p>
      </article>
    </section>

    <div class="detail-actions">
      <button type="button" class="action-btn" @click="editFriend">编辑档案</button>
      <button type="button" class="action-btn danger" @click="handleDelete" :disabled="deleting">
        {{ deleting ? '删除中...' : '删除朋友' }}
      </button>
    </div>

    <ConfirmDialog
      :open="confirmState.open"
      :eyebrow="confirmState.eyebrow"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirm-text="confirmState.confirmText"
      :cancel-text="confirmState.cancelText"
      :danger="confirmState.danger"
      @confirm="runConfirmedAction"
      @cancel="closeConfirmDialog"
    />
  </section>

  <section v-else-if="detailState === 'loading'" class="app-screen is-active">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">加载中</p>
        <h1>正在加载朋友信息</h1>
      </div>
    </div>
  </section>

  <section v-else class="app-screen is-active">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">错误</p>
        <h1>朋友不存在</h1>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Avatar from '@/components/common/Avatar.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import type { CustomField, Friend, PreferenceItem, SemanticType } from '@/types/friend';
import type { MemorialDay } from '@/types/memorial';
import { formatDate, formatMonthDay, getDaysUntilMonthDay } from '@/utils/dateHelpers';
import { PROFILE_INTAKE_FIELD_LABELS } from '@/utils/profileIntake';
import { getStandardBasicInfoEntries, removeBasicInfoField as pruneBasicInfoField, upsertBasicInfoField, type StandardBasicInfoKey } from '@/utils/basicInfo';
import { getFriendBackPath, getFriendSourcePageFromRoute, getFriendSourceQuery } from '@/utils/friendNavigation';
import { getFriendPreferenceItems, getPreferenceCategoryLabel, groupPreferenceItems } from '@/utils/preferences';

type BasicInfoRow =
  | { id: string; type: 'relationship'; label: string; value: string; deletable: false }
  | { id: string; type: 'standard'; label: string; value: string; key: StandardBasicInfoKey; deletable: boolean }
  | { id: string; type: 'custom'; label: string; value: string; fieldId: string; deletable: true };

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();

const friend = ref<Friend | null>(null);
const detailState = ref<'loading' | 'ready' | 'not-found'>('loading');
const deleting = ref(false);
const busyFieldId = ref<string | null>(null);
const busyPreferenceValue = ref<string | null>(null);
const busyBasicInfoId = ref<string | null>(null);
const showBasicInfoCreator = ref(false);
const basicInfoDeleteMode = ref(false);
const stableDeleteMode = ref(false);
const timelineDeleteMode = ref(false);
const basicInfoDraft = ref({ label: '', value: '' });
const personaRefreshAttemptedId = ref<string | null>(null);
const personaRefreshInFlightId = ref<string | null>(null);
const confirmState = ref({
  open: false,
  eyebrow: '提示',
  title: '',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  danger: false,
});
let pendingConfirmAction: (() => void | Promise<void>) | null = null;
const stablePreviewLimit = 4;
const timelinePreviewLimit = 4;
const sourcePage = computed(() => getFriendSourcePageFromRoute(route));
const preferenceItems = computed(() => friend.value ? getFriendPreferenceItems(friend.value) : [] as PreferenceItem[]);
const preferenceGroups = computed(() => Object.entries(groupPreferenceItems(preferenceItems.value))
  .map(([category, items]) => ({
    category,
    label: getPreferenceCategoryLabel(category as PreferenceItem['category']),
    items,
  }))
  .filter((group) => group.items.length > 0));

const stableFields = computed(() => {
  if (!friend.value) return [] as CustomField[];

  return friend.value.customFields.filter((field) => {
    if (field.temporalScope !== 'stable') return false;
    if (field.semanticType === 'preference' || field.semanticType === 'restriction') return false;
    if (field.semanticType === 'milestone' && friend.value?.birthday) return false;
    if (Object.values(PROFILE_INTAKE_FIELD_LABELS).includes(field.label as (typeof PROFILE_INTAKE_FIELD_LABELS)[keyof typeof PROFILE_INTAKE_FIELD_LABELS])) {
      return false;
    }
    return true;
  });
});

const timelineItems = computed(() => {
  if (!friend.value) return [] as CustomField[];

  return friend.value.customFields
    .filter((field) => field.temporalScope === 'timebound' && field.includeInTimeline)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

const linkedMemorialDays = computed(() => {
  if (!friend.value) return [] as MemorialDay[];

  return memorialDaysStore.memorialDays
    .filter((item) => item.friendIds.includes(friend.value!.id))
    .sort((a, b) => getDaysUntilMonthDay(a.monthDay) - getDaysUntilMonthDay(b.monthDay));
});

const hasSupplementOverflow = computed(() => {
  if (!friend.value) return false;
  return stableFields.value.length > stablePreviewLimit || preferenceItems.value.length > 6;
});

const basicInfoRows = computed<BasicInfoRow[]>(() => {
  if (!friend.value) return [];

  const rows: BasicInfoRow[] = [
    {
      id: 'relationship',
      type: 'relationship',
      label: '关系',
      value: friend.value.relationship || '-',
      deletable: false,
    },
  ];

  for (const entry of getStandardBasicInfoEntries(friend.value)) {
    if (entry.key === 'relationship') continue;
    rows.push({
      id: `standard-${entry.key}`,
      type: 'standard',
      label: entry.label,
      value: formatBasicInfoValue(entry.key, entry.value),
      key: entry.key,
      deletable: entry.key !== 'gender',
    });
  }

  for (const field of friend.value.basicInfoFields) {
    rows.push({
      id: `custom-${field.id}`,
      type: 'custom',
      label: field.label,
      value: field.value,
      fieldId: field.id,
      deletable: true,
    });
  }

  return rows;
});

onMounted(async () => {
  const id = route.params.id as string;
  await Promise.all([
    loadCurrentFriend(id),
    memorialDaysStore.loadMemorialDays(),
  ]);
});

watch(
  () => route.params.id,
  async (nextId) => {
    if (typeof nextId === 'string' && nextId) {
      await loadCurrentFriend(nextId);
    }
  },
);

function formatBasicInfoValue(key: StandardBasicInfoKey, value: string): string {
  if (key === 'heightCm') return `${value} cm`;
  if (key === 'weightKg') return `${value} kg`;
  return value;
}

function semanticTypeText(type: SemanticType): string {
  const map: Record<SemanticType, string> = {
    preference: '偏好',
    restriction: '禁忌',
    status: '事件',
    event: '事件',
    milestone: '重要信息',
    note: '重要信息',
  };
  return map[type];
}

function showStableFieldTitle(field: CustomField): boolean {
  const normalizedLabel = field.label.trim();
  return Boolean(normalizedLabel) && normalizedLabel !== semanticTypeText(field.semanticType);
}

function goBack(): void {
  router.push(getFriendBackPath(sourcePage.value));
}

function openAskAI(): void {
  if (!friend.value) return;
  router.push({
    name: 'ask-ai',
    params: { id: friend.value.id },
    query: getFriendSourceQuery(sourcePage.value),
  });
}

function openSupplementPage(): void {
  if (!friend.value) return;
  router.push({
    name: 'friend-supplement',
    params: { id: friend.value.id },
    query: getFriendSourceQuery(sourcePage.value),
  });
}

function openProfileIntake(): void {
  if (!friend.value) return;
  router.push({
    name: 'profile-intake',
    params: { id: friend.value.id },
    query: getFriendSourceQuery(sourcePage.value),
  });
}

function editFriend(): void {
  if (friend.value) {
    router.push({
      name: 'edit-friend',
      params: { id: friend.value.id },
      query: getFriendSourceQuery(sourcePage.value),
    });
  }
}

function goToCalendar(): void {
  router.push('/calendar');
}

function openRecordList(section: 'stable' | 'timeline'): void {
  if (!friend.value) return;
  router.push({
    name: 'friend-record-list',
    params: { id: friend.value.id, section },
    query: getFriendSourceQuery(sourcePage.value),
  });
}

function memorialRelativeText(monthDay: string): string {
  const daysUntil = getDaysUntilMonthDay(monthDay);
  if (daysUntil === 0) return '今天';
  if (daysUntil === 1) return '明天';
  if (daysUntil > 1) return `${daysUntil} 天后`;
  return '已过';
}

function toggleBasicInfoCreator(): void {
  showBasicInfoCreator.value = !showBasicInfoCreator.value;
  if (!showBasicInfoCreator.value) {
    resetBasicInfoDraft();
  }
}

function toggleBasicInfoDeleteMode(): void {
  basicInfoDeleteMode.value = !basicInfoDeleteMode.value;
}

function toggleStableDeleteMode(): void {
  stableDeleteMode.value = !stableDeleteMode.value;
}

function toggleTimelineDeleteMode(): void {
  timelineDeleteMode.value = !timelineDeleteMode.value;
}

function resetBasicInfoDraft(): void {
  basicInfoDraft.value = { label: '', value: '' };
  busyBasicInfoId.value = null;
}

function buildStandardFieldClearPayload(key: StandardBasicInfoKey): Partial<Friend> {
  const emptyValue = key === 'age' || key === 'heightCm' || key === 'weightKg' ? undefined : '';
  return { [key]: emptyValue } as Partial<Friend>;
}

async function saveNewBasicInfoField(): Promise<void> {
  if (!friend.value || !basicInfoDraft.value.label.trim() || !basicInfoDraft.value.value.trim()) {
    return;
  }

  busyBasicInfoId.value = '__creating__';
  try {
    const nextBasicInfoFields = upsertBasicInfoField(friend.value.basicInfoFields, basicInfoDraft.value);
    const updated = await friendsStore.updateFriend(friend.value.id, { basicInfoFields: nextBasicInfoFields });
    if (updated) friend.value = updated;
    queuePersonaRefresh(friend.value.id);
    resetBasicInfoDraft();
    showBasicInfoCreator.value = false;
    basicInfoDeleteMode.value = false;
  } finally {
    busyBasicInfoId.value = null;
  }
}

async function removeBasicInfoRow(row: BasicInfoRow): Promise<void> {
  if (!friend.value || !row.deletable) return;

  openConfirmDialog({
    eyebrow: '删除基础信息',
    title: `确认删除${row.label}？`,
    message: '删除后这条基础信息不会再展示。',
    confirmText: '删除',
    danger: true,
    onConfirm: async () => {
      busyBasicInfoId.value = row.id;
      try {
        if (row.type === 'custom') {
          const nextBasicInfoFields = pruneBasicInfoField(friend.value!.basicInfoFields, row.fieldId);
          const updated = await friendsStore.updateFriend(friend.value!.id, { basicInfoFields: nextBasicInfoFields });
          if (updated) friend.value = updated;
        }

        if (row.type === 'standard') {
          const updated = await friendsStore.updateFriend(friend.value!.id, buildStandardFieldClearPayload(row.key));
          if (updated) friend.value = updated;
        }

        queuePersonaRefresh(friend.value!.id);
        basicInfoDeleteMode.value = false;
      } finally {
        busyBasicInfoId.value = null;
      }
    },
  });
}

async function removePreference(id: string): Promise<void> {
  if (!friend.value || busyPreferenceValue.value === id) return;

  busyPreferenceValue.value = id;
  try {
    const nextPreferenceItems = getFriendPreferenceItems(friend.value).filter((item) => item.id !== id);
    const updated = await friendsStore.updateFriend(friend.value.id, { preferenceItems: nextPreferenceItems });
    if (updated) friend.value = updated;
    queuePersonaRefresh(friend.value.id);
    if (getFriendPreferenceItems(friend.value).length === 0 && stableFields.value.length === 0) {
      stableDeleteMode.value = false;
    }
  } finally {
    busyPreferenceValue.value = null;
  }
}

async function removeField(fieldId: string): Promise<void> {
  if (!friend.value || busyFieldId.value === fieldId) return;

  openConfirmDialog({
    eyebrow: '删除记录',
    title: '确认删除这条记录？',
    message: '删除后不会保留在补充信息或时间线里。',
    confirmText: '删除',
    danger: true,
    onConfirm: async () => {
      busyFieldId.value = fieldId;
      try {
        const nextFields = friend.value!.customFields.filter((field) => field.id !== fieldId);
        const updated = await friendsStore.updateFriend(friend.value!.id, { customFields: nextFields });
        if (updated) friend.value = updated;
        queuePersonaRefresh(friend.value!.id);
        if (friend.value!.preferences.length === 0 && stableFields.value.length === 0) {
          stableDeleteMode.value = false;
        }
        if (timelineItems.value.length <= 1) {
          timelineDeleteMode.value = false;
        }
      } finally {
        busyFieldId.value = null;
      }
    },
  });
}

function openConfirmDialog(options: {
  eyebrow: string;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}): void {
  pendingConfirmAction = options.onConfirm;
  confirmState.value = {
    open: true,
    eyebrow: options.eyebrow,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText,
    cancelText: options.cancelText ?? '取消',
    danger: options.danger ?? false,
  };
}

function closeConfirmDialog(): void {
  confirmState.value.open = false;
  pendingConfirmAction = null;
}

async function runConfirmedAction(): Promise<void> {
  const action = pendingConfirmAction;
  closeConfirmDialog();
  if (action) {
    await action();
  }
}

async function loadCurrentFriend(id: string): Promise<void> {
  detailState.value = 'loading';

  if (friendsStore.friends.length === 0) {
    await friendsStore.loadFriends();
  }

  const currentFriend = await friendsStore.getFriendById(id);
  if (!currentFriend) {
    friend.value = null;
    detailState.value = 'not-found';
    return;
  }

  detailState.value = 'ready';
  friend.value = currentFriend;

  if (
    friend.value
    && friend.value.aiProfile.source !== 'llm'
    && personaRefreshAttemptedId.value !== friend.value.id
  ) {
    personaRefreshAttemptedId.value = friend.value.id;
    void refreshPersonaFromAI(friend.value.id);
  }
}

async function refreshPersonaFromAI(id: string): Promise<void> {
  if (personaRefreshInFlightId.value === id) return;

  personaRefreshInFlightId.value = id;
  try {
    const updated = await friendsStore.refreshFriendPersona(id);
    if (updated) friend.value = updated;
  } catch {
    // Keep fallback persona.
  } finally {
    if (personaRefreshInFlightId.value === id) {
      personaRefreshInFlightId.value = null;
    }
  }
}

function queuePersonaRefresh(id: string): void {
  void refreshPersonaFromAI(id);
}

async function handleDelete(): Promise<void> {
  if (!friend.value || deleting.value) return;

  openConfirmDialog({
    eyebrow: '删除档案',
    title: `确认删除 ${friend.value.name} 的档案？`,
    message: '此操作不可撤销，相关信息也会一起删除。',
    confirmText: '删除档案',
    danger: true,
    onConfirm: async () => {
      deleting.value = true;
      try {
        await friendsStore.deleteFriend(friend.value!.id);
        await router.push(getFriendBackPath(sourcePage.value));
      } finally {
        deleting.value = false;
      }
    },
  });
}
</script>

<style scoped>
.detail-screen {
  padding-bottom: 140px;
}

.section-head,
.section-inline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.more-link {
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  padding: 0;
}

.quick-action-card,
.memorial-preview-card {
  display: grid;
  gap: 14px;
}

.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.profile-stat-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.profile-stat {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 8px 10px;
  display: grid;
  gap: 2px;
  text-align: center;
  background: rgba(255, 255, 255, 0.62);
}

.profile-stat strong {
  font-size: 18px;
  line-height: 1.1;
}

.profile-stat span,
.basic-info-main span,
.clamped-text,
.timeline-meta span,
.timeline-content p,
.memorial-preview-row p {
  color: var(--muted);
}

.basic-info-head-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.basic-info-action {
  position: relative;
  padding: 0;
  font-size: 0;
  line-height: 0;
  color: transparent;
}

.basic-info-action::after {
  display: block;
  color: #11181c;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
}

.basic-info-edit-toggle::after {
  content: '编辑';
}

.basic-info-edit-toggle.is-active::after {
  content: '完成';
}

.basic-info-create-toggle::after {
  content: '新增';
}

.basic-info-create-toggle.is-active::after {
  content: '收起';
}

.basic-info-row,
.custom-field-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.basic-info-row:last-child,
.custom-field-row:last-child {
  border-bottom: 0;
}

.basic-info-main,
.custom-field-meta,
.memorial-preview-row {
  display: grid;
  gap: 4px;
  flex: 1;
}

.record-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.mini-action {
  border: 0;
  background: rgba(29, 40, 49, 0.08);
  color: var(--ink);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
}

.mini-action.solid {
  background: var(--ink);
  color: #fff;
}

.record-editor {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(29, 40, 49, 0.04);
}

.record-editor input {
  width: 100%;
}

.record-editor-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.custom-card {
  display: grid;
  gap: 10px;
}

.preference-column {
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(29, 40, 49, 0.08);
}

.preference-column:first-child {
  padding-top: 0;
  border-top: 0;
}

.compact-tags-preview {
  max-height: 152px;
  overflow: hidden;
}

.editable-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px 9px 14px;
  border-radius: 999px;
  background: rgba(29, 40, 49, 0.06);
}

.delete-link:not(.basic-info-action),
.delete-x,
.tag-remove-btn {
  color: #c74848;
}

.supplement-head-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.delete-link {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 13px;
}

.delete-x,
.tag-remove-btn {
  border: 0;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  padding: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.record-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22px;
  align-items: flex-start;
  gap: 12px;
}

.record-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22px;
  gap: 12px;
  align-items: start;
  width: 100%;
}

.record-main {
  min-width: 0;
  width: 100%;
}

.record-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  min-width: 22px;
  width: 22px;
  margin-left: auto;
}

.timeline-card {
  position: relative;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 12px;
  padding: 4px 0 16px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--ink);
  box-shadow: 0 0 0 4px rgba(29, 40, 49, 0.08);
}

.timeline-content {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.timeline-item:last-child .timeline-content {
  padding-bottom: 0;
  border-bottom: 0;
}

.timeline-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.timeline-top-row {
  display: block;
}

.timeline-value-row {
  display: block;
}

.timeline-tags {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22px;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
}

.timeline-tags span {
  justify-self: start;
  font-size: 12px;
  color: var(--muted);
  background: rgba(29, 40, 49, 0.05);
  border-radius: 999px;
  padding: 6px 10px;
}

.timeline-actions {
  margin-top: 0;
  align-self: center;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}

.danger {
  background: rgba(255, 107, 107, 0.12);
  color: #a63a3a;
}

@media (max-width: 520px) {
  .quick-action-grid,
  .detail-actions,
  .profile-stat-strip {
    grid-template-columns: 1fr 1fr;
  }

  .basic-info-row,
  .custom-field-row {
    flex-direction: column;
  }

  .record-actions {
    justify-content: flex-start;
  }
}
</style>
