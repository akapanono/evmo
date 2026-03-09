<template>
  <section v-if="friend" class="app-screen is-active list-screen">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">完整列表</p>
        <h1>{{ pageTitle }}</h1>
      </div>
    </div>

    <article class="hero-note">
      <strong>{{ friend.name }}</strong>
      <p>{{ pageDescription }}</p>
    </article>

    <article v-if="message || error" class="info-card feedback-card">
      <p v-if="message" class="success-text">{{ message }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </article>

    <template v-if="section === 'stable'">
      <article v-if="preferences.length > 0" class="info-card preference-card">
        <div class="section-inline-head">
          <p class="mini-label">偏好标签</p>
        </div>
        <div class="tag-group tag-group-list">
          <div v-for="pref in preferences" :key="pref" class="preference-row">
            <template v-if="editingPreferenceValue === pref">
              <div class="preference-editor">
                <input v-model="preferenceDraft" type="text" placeholder="偏好标签" />
                <div class="record-editor-actions">
                  <button type="button" class="mini-action" @click="cancelPreferenceEdit">取消</button>
                  <button
                    type="button"
                    class="mini-action solid"
                    @click="savePreferenceEdit(pref)"
                    :disabled="busyPreferenceValue === pref || !preferenceDraft.trim()"
                  >
                    保存
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="editable-tag is-full">
                <span>{{ pref }}</span>
                <div class="tag-actions">
                  <button type="button" class="tag-action-link" @click="startEditPreference(pref)">编辑</button>
                  <button
                    type="button"
                    class="tag-remove-btn"
                    @click="removePreference(pref)"
                    :disabled="busyPreferenceValue === pref"
                    aria-label="删除偏好标签"
                  >
                    ×
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </article>

      <article v-if="records.length > 0" class="info-card">
        <div class="section-inline-head">
          <p class="mini-label">稳定信息</p>
        </div>
        <div v-for="item in records" :key="item.id" class="list-row">
          <div class="record-head">
            <div class="list-meta">
              <strong v-if="showStableFieldTitle(item)">{{ item.label }}</strong>
            </div>
            <div class="record-actions">
              <button type="button" class="mini-action" @click="startEditField(item)">编辑</button>
              <button type="button" class="mini-action danger-text" @click="removeField(item.id)" :disabled="busyFieldId === item.id">
                删除
              </button>
            </div>
          </div>

          <div v-if="editingFieldId === item.id" class="record-editor">
            <input v-model="fieldDraft.label" type="text" placeholder="记录标题" />
            <textarea v-model="fieldDraft.value" rows="3" placeholder="记录内容"></textarea>
            <div class="record-editor-actions">
              <button type="button" class="mini-action" @click="cancelEditField">取消</button>
              <button
                type="button"
                class="mini-action solid"
                @click="saveFieldEdit(item.id)"
                :disabled="busyFieldId === item.id || !fieldDraft.value.trim()"
              >
                保存
              </button>
            </div>
          </div>

          <p v-else>{{ item.value }}</p>
        </div>
      </article>

      <article v-if="preferences.length === 0 && records.length === 0" class="note-card">
        <p>{{ emptyText }}</p>
      </article>
    </template>

    <template v-else>
      <article v-if="records.length > 0" class="info-card">
        <div v-for="item in records" :key="item.id" class="list-row">
          <div class="record-head">
            <div class="list-meta">
              <strong>{{ item.label }}</strong>
              <span>{{ formatDate(item.createdAt, 'MM-dd HH:mm') }}</span>
            </div>
            <div class="record-actions">
              <button type="button" class="mini-action" @click="startEditField(item)">编辑</button>
              <button type="button" class="mini-action danger-text" @click="removeField(item.id)" :disabled="busyFieldId === item.id">
                删除
              </button>
            </div>
          </div>

          <div v-if="editingFieldId === item.id" class="record-editor timeline-editor">
            <input v-model="fieldDraft.label" type="text" placeholder="记录标题" />
            <textarea v-model="fieldDraft.value" rows="3" placeholder="记录内容"></textarea>
            <input v-model="fieldDraft.eventTimeText" type="text" placeholder="时间词，可选，例如：下周、明天" />
            <div class="record-editor-actions">
              <button type="button" class="mini-action" @click="cancelEditField">取消</button>
              <button
                type="button"
                class="mini-action solid"
                @click="saveFieldEdit(item.id)"
                :disabled="busyFieldId === item.id || !fieldDraft.value.trim()"
              >
                保存
              </button>
            </div>
          </div>

          <template v-else>
            <p>{{ item.value }}</p>
            <div v-if="item.eventTimeText" class="inline-tag">
              <span>{{ item.eventTimeText }}</span>
            </div>
          </template>
        </div>
      </article>

      <article v-else class="note-card">
        <p>{{ emptyText }}</p>
      </article>
    </template>

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

  <section v-else class="app-screen is-active">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">错误</p>
        <h1>朋友不存在</h1>
      </div>
    </div>

    <article class="empty-state-card">
      <div class="empty-icon">:(</div>
      <h2>找不到这位朋友</h2>
      <p>该朋友可能已被删除，或者链接无效。</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useFriendsStore } from '@/stores/friends';
import type { CustomField, Friend, SemanticType } from '@/types/friend';
import { formatDate } from '@/utils/dateHelpers';
import { PROFILE_INTAKE_FIELD_LABELS } from '@/utils/profileIntake';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();
const friend = ref<Friend | null>(null);
const message = ref('');
const error = ref('');
const editingFieldId = ref<string | null>(null);
const busyFieldId = ref<string | null>(null);
const editingPreferenceValue = ref<string | null>(null);
const busyPreferenceValue = ref<string | null>(null);
const preferenceDraft = ref('');
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
const fieldDraft = ref({
  label: '',
  value: '',
  eventTimeText: '',
});

const section = computed(() => route.params.section as 'stable' | 'timeline');
const pageTitle = computed(() => section.value === 'timeline' ? '记录时间线' : '补充信息');
const pageDescription = computed(() => section.value === 'timeline' ? '这里展示所有有时效性的事件记录。' : '这里展示所有偏好标签和稳定保存的重要信息。');
const emptyText = computed(() => section.value === 'timeline' ? '当前还没有时间线记录。' : '当前还没有补充信息。');
const preferences = computed(() => friend.value?.preferences ?? []);

const records = computed(() => {
  if (!friend.value) {
    return [] as CustomField[];
  }

  if (section.value === 'timeline') {
    return friend.value.customFields
      .filter((field) => field.temporalScope === 'timebound' && field.includeInTimeline)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return friend.value.customFields
    .filter(
      (field) => field.temporalScope === 'stable'
        && field.semanticType !== 'preference'
        && field.semanticType !== 'restriction'
        && !(field.semanticType === 'milestone' && friend.value?.birthday)
        && !Object.values(PROFILE_INTAKE_FIELD_LABELS).includes(field.label as (typeof PROFILE_INTAKE_FIELD_LABELS)[keyof typeof PROFILE_INTAKE_FIELD_LABELS]),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

onMounted(async () => {
  await friendsStore.loadFriends();
  const id = route.params.id as string;
  friend.value = friendsStore.friends.find((item) => item.id === id) ?? null;
});

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
  if (!normalizedLabel) {
    return false;
  }

  return normalizedLabel !== semanticTypeText(field.semanticType);
}

function startEditField(field: CustomField): void {
  editingFieldId.value = field.id;
  fieldDraft.value = {
    label: field.label,
    value: field.value,
    eventTimeText: field.eventTimeText ?? '',
  };
}

function cancelEditField(): void {
  editingFieldId.value = null;
  busyFieldId.value = null;
  fieldDraft.value = {
    label: '',
    value: '',
    eventTimeText: '',
  };
}

function startEditPreference(value: string): void {
  editingPreferenceValue.value = value;
  preferenceDraft.value = value;
}

function cancelPreferenceEdit(): void {
  editingPreferenceValue.value = null;
  busyPreferenceValue.value = null;
  preferenceDraft.value = '';
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

async function refreshCurrentFriend(id: string): Promise<void> {
  await friendsStore.loadFriends();
  friend.value = friendsStore.friends.find((item) => item.id === id) ?? null;
}

async function saveFieldEdit(fieldId: string): Promise<void> {
  if (!friend.value || !fieldDraft.value.value.trim()) {
    return;
  }

  busyFieldId.value = fieldId;
  message.value = '';
  error.value = '';

  try {
    const currentId = friend.value.id;
    const isTimelineField = section.value === 'timeline';
    const nextFields: CustomField[] = friend.value.customFields.map((field) => {
      if (field.id !== fieldId) {
        return field;
      }

      return {
        ...field,
        label: fieldDraft.value.label.trim() || field.label,
        value: fieldDraft.value.value.trim(),
        includeInTimeline: isTimelineField,
        temporalScope: isTimelineField ? 'timebound' : 'stable',
        eventTimeText: isTimelineField ? fieldDraft.value.eventTimeText.trim() || undefined : undefined,
        sourceText: fieldDraft.value.value.trim(),
      };
    });

    await friendsStore.updateFriend(currentId, { customFields: nextFields });
    await refreshCurrentFriend(currentId);
    message.value = '记录已更新。';
    cancelEditField();
  } catch (err) {
    error.value = `更新失败：${(err as Error).message}`;
    busyFieldId.value = null;
  }
}

async function removeField(fieldId: string): Promise<void> {
  if (!friend.value || busyFieldId.value === fieldId) {
    return;
  }

  openConfirmDialog({
    eyebrow: '删除记录',
    title: '确认删除这条记录？',
    message: '删除后不会出现在当前完整列表中。',
    confirmText: '删除',
    cancelText: '保留',
    danger: true,
    onConfirm: async () => {
      busyFieldId.value = fieldId;
      message.value = '';
      error.value = '';

      try {
        const currentId = friend.value!.id;
        const nextFields = friend.value!.customFields.filter((field) => field.id !== fieldId);
        await friendsStore.updateFriend(currentId, { customFields: nextFields });
        await refreshCurrentFriend(currentId);
        message.value = '记录已删除。';
        if (editingFieldId.value === fieldId) {
          cancelEditField();
        } else {
          busyFieldId.value = null;
        }
      } catch (err) {
        error.value = `删除失败：${(err as Error).message}`;
        busyFieldId.value = null;
      }
    },
  });
}

async function savePreferenceEdit(previousValue: string): Promise<void> {
  if (!friend.value || !preferenceDraft.value.trim()) {
    return;
  }

  busyPreferenceValue.value = previousValue;
  message.value = '';
  error.value = '';

  try {
    const currentId = friend.value.id;
    const nextValue = preferenceDraft.value.trim();
    const nextPreferences = friend.value.preferences.map((item) => item === previousValue ? nextValue : item);
    await friendsStore.updateFriend(currentId, { preferences: Array.from(new Set(nextPreferences)) });
    await refreshCurrentFriend(currentId);
    message.value = '偏好标签已更新。';
    cancelPreferenceEdit();
  } catch (err) {
    error.value = `更新失败：${(err as Error).message}`;
    busyPreferenceValue.value = null;
  }
}

async function removePreference(value: string): Promise<void> {
  if (!friend.value || busyPreferenceValue.value === value) {
    return;
  }

  busyPreferenceValue.value = value;
  message.value = '';
  error.value = '';

  try {
    const currentId = friend.value.id;
    const nextPreferences = friend.value.preferences.filter((item) => item !== value);
    await friendsStore.updateFriend(currentId, { preferences: nextPreferences });
    await refreshCurrentFriend(currentId);
    message.value = '偏好标签已删除。';
    if (editingPreferenceValue.value === value) {
      cancelPreferenceEdit();
    } else {
      busyPreferenceValue.value = null;
    }
  } catch (err) {
    error.value = `删除失败：${(err as Error).message}`;
    busyPreferenceValue.value = null;
  }
}

function goBack(): void {
  if (friend.value) {
    router.push(`/friend/${friend.value.id}`);
    return;
  }

  router.push('/');
}
</script>

<style scoped>
.list-screen {
  padding-bottom: 40px;
}

.hero-note {
  display: grid;
  gap: 6px;
  padding: 18px;
  margin-top: 12px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid var(--line);
}

.hero-note p {
  color: var(--muted);
  line-height: 1.6;
}

.feedback-card {
  margin-top: 12px;
}

.success-text {
  color: #1f7a4d;
}

.error-text {
  color: #b42318;
}

.preference-card {
  margin-top: 12px;
}

.section-inline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.tag-group-list {
  gap: 10px;
}

.preference-row {
  width: 100%;
}

.list-row {
  display: grid;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}

.list-row:last-child {
  border-bottom: 0;
}

.record-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.list-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  flex: 1;
}

.list-meta span {
  font-size: 12px;
  color: var(--muted);
}

.record-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.list-row p {
  color: var(--muted);
  line-height: 1.6;
}

.record-editor,
.preference-editor {
  display: grid;
  gap: 10px;
}

.record-editor input,
.record-editor textarea,
.preference-editor input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px 14px;
  font: inherit;
  color: var(--ink);
}

.record-editor textarea {
  resize: vertical;
}

.record-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.mini-action {
  border: 1px solid rgba(29, 40, 49, 0.14);
  background: transparent;
  color: var(--ink);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
}

.mini-action.solid {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}

.danger-text {
  color: #b42318;
}

.editable-tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border-radius: 999px;
  background: rgba(29, 40, 49, 0.06);
  padding: 6px 6px 6px 14px;
}

.editable-tag.is-full > span {
  color: var(--ink);
}

.tag-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tag-action-link {
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 12px;
}

.tag-remove-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 0;
  background: rgba(29, 40, 49, 0.1);
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  padding: 0;
}

.inline-tag {
  display: flex;
  justify-content: flex-start;
}

.inline-tag span {
  font-size: 12px;
  color: var(--muted);
  background: rgba(29, 40, 49, 0.05);
  border-radius: 999px;
  padding: 6px 10px;
}

.empty-state-card {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 20px;
  color: var(--muted);
}

.empty-state-card h2 {
  font-size: 24px;
  margin-bottom: 12px;
  color: var(--ink);
}

.empty-state-card p {
  color: var(--muted);
  margin-bottom: 24px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .record-head,
  .list-meta,
  .editable-tag {
    display: grid;
  }

  .record-actions,
  .tag-actions {
    justify-content: flex-start;
  }
}
</style>
