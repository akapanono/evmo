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
      <Avatar size="xxl" :color="friend.avatarColor">
        {{ friend.name.charAt(0) }}
      </Avatar>
      <h2>{{ friend.name }}</h2>
      <p>
        {{ friend.relationship || '未填写关系' }}
        <template v-if="friend.birthday">
          · {{ formatBirthday(friend.birthday) }}
        </template>
      </p>
    </article>

    <section ref="supplementSection" class="section-block">
      <div class="section-head">
        <h3>一句话补充信息</h3>
      </div>
      <article class="form-card soft-panel">
        <textarea
          ref="supplementTextarea"
          v-model="quickNote"
          rows="3"
          placeholder="例如：他最近在准备考研；她下周要出差；她不吃香菜"
          :disabled="isSubmittingSupplement"
        ></textarea>
        <p class="field-hint">
          可直接本地保存，也可以走 AI 结构化解析。AI 未配置时会自动回退到本地规则。
        </p>
        <div class="detail-actions supplement-actions supplement-grid">
          <button type="button" class="action-btn" @click="quickNote = ''" :disabled="isSubmittingSupplement || !quickNote.trim()">
            清空
          </button>
          <button type="button" class="action-btn" @click="saveSupplement('llm')" :disabled="isSubmittingSupplement || !quickNote.trim()">
            {{ aiSavingSupplement ? 'AI解析中...' : 'AI解析保存' }}
          </button>
          <button type="button" class="action-btn primary full-span" @click="saveSupplement('rule')" :disabled="isSubmittingSupplement || !quickNote.trim()">
            {{ savingSupplement ? '保存中...' : '直接保存' }}
          </button>
        </div>
        <p v-if="supplementMessage" class="success-message">{{ supplementMessage }}</p>
        <p v-if="supplementError" class="error-message">{{ supplementError }}</p>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>基础信息</h3>
      </div>
      <article class="info-card">
        <InfoRow label="昵称">
          {{ friend.nickname || '-' }}
        </InfoRow>
        <InfoRow label="关系">
          {{ friend.relationship || '-' }}
        </InfoRow>
        <InfoRow label="生日">
          {{ friend.birthday ? formatBirthday(friend.birthday) : '-' }}
        </InfoRow>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>补充信息</h3>
      </div>
      <article v-if="friend.preferences.length > 0" class="custom-card">
        <p class="mini-label">偏好标签</p>
        <div class="tag-group compact-tags">
          <span v-for="pref in friend.preferences" :key="pref">{{ pref }}</span>
        </div>
      </article>

      <article v-if="stableFields.length > 0" class="info-card custom-fields-card">
        <p class="mini-label">稳定信息</p>
        <div v-for="field in stableFields" :key="field.id" class="custom-field-row">
          <div class="record-head">
            <div class="custom-field-meta">
              <strong>{{ field.label }}</strong>
              <span>{{ semanticTypeText(field.semanticType) }}</span>
            </div>
            <div class="record-actions">
              <button type="button" class="mini-action" @click="startEditField(field)">编辑</button>
              <button type="button" class="mini-action danger-text" @click="removeField(field.id)" :disabled="busyFieldId === field.id">删除</button>
            </div>
          </div>

          <div v-if="editingFieldId === field.id" class="record-editor">
            <input v-model="fieldDraft.label" type="text" placeholder="记录标题" />
            <textarea v-model="fieldDraft.value" rows="3" placeholder="记录内容"></textarea>
            <div class="record-editor-actions">
              <button type="button" class="mini-action" @click="cancelEditField">取消</button>
              <button type="button" class="mini-action solid" @click="saveFieldEdit(field.id)" :disabled="busyFieldId === field.id || !fieldDraft.value.trim()">
                保存
              </button>
            </div>
          </div>
          <span v-else>{{ field.value }}</span>
        </div>
      </article>

      <article v-if="friend.preferences.length === 0 && stableFields.length === 0" class="note-card">
        <p>还没有补充信息。</p>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>记录时间线</h3>
      </div>
      <article v-if="timelineItems.length > 0" class="info-card timeline-card">
        <div v-for="item in timelineItems" :key="item.id" class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-meta timeline-meta-top">
              <strong>事件</strong>
              <span>{{ formatDate(item.createdAt, 'MM-dd HH:mm') }}</span>
            </div>

            <div v-if="editingFieldId === item.id" class="record-editor timeline-editor">
              <input v-model="fieldDraft.label" type="text" placeholder="记录标题" />
              <textarea v-model="fieldDraft.value" rows="3" placeholder="记录内容"></textarea>
              <input v-model="fieldDraft.eventTimeText" type="text" placeholder="时间词，可选，例如：下周、明天" />
              <div class="record-editor-actions">
                <button type="button" class="mini-action" @click="cancelEditField">取消</button>
                <button type="button" class="mini-action solid" @click="saveFieldEdit(item.id)" :disabled="busyFieldId === item.id || !fieldDraft.value.trim()">
                  保存
                </button>
                <button type="button" class="mini-action danger-text" @click="removeField(item.id)" :disabled="busyFieldId === item.id">
                  删除
                </button>
              </div>
            </div>
            <template v-else>
              <p>{{ item.value }}</p>
              <div v-if="item.eventTimeText" class="timeline-tags">
                <span>{{ item.eventTimeText }}</span>
              </div>
              <div class="record-actions timeline-actions">
                <button type="button" class="mini-action" @click="startEditField(item)">编辑</button>
                <button type="button" class="mini-action danger-text" @click="removeField(item.id)" :disabled="busyFieldId === item.id">删除</button>
              </div>
            </template>
          </div>
        </div>
      </article>
      <article v-else class="note-card">
        <p>时间线只展示有时效性的事情。当前还没有这类记录。</p>
      </article>
    </section>

    <div class="detail-actions">
      <button type="button" class="action-btn" @click="editFriend">编辑档案</button>
      <button type="button" class="action-btn danger" @click="handleDelete" :disabled="deleting">
        {{ deleting ? '删除中...' : '删除朋友' }}
      </button>
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

    <article class="empty-state-card">
      <div class="empty-icon">:(</div>
      <h2>找不到这位朋友</h2>
      <p>该朋友可能已被删除，或者链接无效。</p>
      <button type="button" class="action-btn primary" @click="goBack">
        返回首页
      </button>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Avatar from '@/components/common/Avatar.vue';
import InfoRow from '@/components/friend/InfoRow.vue';
import { useFriendsStore } from '@/stores/friends';
import { aiService } from '@/services/aiService';
import type { Friend, CustomField, SemanticType } from '@/types/friend';
import type { SemanticExtractionResult } from '@/types/extraction';
import { formatBirthday, formatDate } from '@/utils/dateHelpers';
import { parseSupplementInput } from '@/utils/semantic';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();
const friend = ref<Friend | null>(null);
const deleting = ref(false);
const quickNote = ref('');
const supplementSection = ref<HTMLElement | null>(null);
const supplementTextarea = ref<HTMLTextAreaElement | null>(null);
const savingSupplement = ref(false);
const aiSavingSupplement = ref(false);
const supplementMessage = ref('');
const supplementError = ref('');
const editingFieldId = ref<string | null>(null);
const busyFieldId = ref<string | null>(null);
const fieldDraft = ref({
  label: '',
  value: '',
  eventTimeText: '',
  includeInTimeline: false,
});

const isSubmittingSupplement = computed(() => savingSupplement.value || aiSavingSupplement.value);

const stableFields = computed(() => {
  if (!friend.value) {
    return [] as CustomField[];
  }

  return friend.value.customFields.filter((field) => {
    if (field.temporalScope !== 'stable') {
      return false;
    }

    if (field.semanticType === 'preference' || field.semanticType === 'restriction') {
      return false;
    }

    if (field.semanticType === 'milestone' && friend.value?.birthday) {
      return false;
    }

    return true;
  });
});

const timelineItems = computed(() => {
  if (!friend.value) {
    return [] as CustomField[];
  }

  return friend.value.customFields
    .filter((field) => field.temporalScope === 'timebound' && field.includeInTimeline)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

onMounted(async () => {
  await friendsStore.loadFriends();
  const id = route.params.id as string;
  friend.value = friendsStore.friends.find((item) => item.id === id) ?? null;
  await applySuggestionFromRoute();
});

watch(
  () => route.query.suggestion,
  async () => {
    await applySuggestionFromRoute();
  },
);

async function applySuggestionFromRoute(): Promise<void> {
  const suggestion = typeof route.query.suggestion === 'string' ? route.query.suggestion.trim() : '';
  if (!suggestion) {
    return;
  }

  quickNote.value = suggestion;
  await nextTick();
  supplementSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  supplementTextarea.value?.focus();
  supplementTextarea.value?.setSelectionRange(quickNote.value.length, quickNote.value.length);

  await router.replace({
    name: 'friend-detail',
    params: { id: route.params.id as string },
    query: {},
  });
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

function goBack(): void {
  router.push('/');
}

function editFriend(): void {
  if (friend.value) {
    router.push(`/edit/${friend.value.id}`);
  }
}

async function refreshCurrentFriend(id: string): Promise<void> {
  await friendsStore.loadFriends();
  friend.value = friendsStore.friends.find((item) => item.id === id) ?? null;
}

async function applyParsedResult(parsed: SemanticExtractionResult, mode: 'rule' | 'llm'): Promise<void> {
  if (!friend.value) {
    return;
  }

  const existingPreferenceSet = new Set(friend.value.preferences);
  for (const pref of parsed.preferences) {
    existingPreferenceSet.add(pref);
  }

  const now = new Date().toISOString();
  const nextFields = [
    ...parsed.records.map((field) => ({
      id: crypto.randomUUID(),
      label: field.label,
      value: field.value,
      createdAt: now,
      includeInTimeline: field.includeInTimeline,
      semanticType: field.semanticType,
      temporalScope: field.temporalScope,
      extractionMethod: field.extractionMethod,
      sourceText: field.sourceText,
      eventTimeText: field.eventTimeText,
    })),
    ...friend.value.customFields,
  ].slice(0, 20);

  const currentId = friend.value.id;
  await friendsStore.updateFriend(currentId, {
    birthday: parsed.birthday ?? friend.value.birthday,
    preferences: Array.from(existingPreferenceSet),
    customFields: nextFields,
  });
  await refreshCurrentFriend(currentId);
  quickNote.value = '';

  if (parsed.records.length > 0) {
    supplementMessage.value = parsed.records.some((field) => field.includeInTimeline)
      ? `${mode === 'llm' ? 'AI' : '本地'}解析完成，已加入时间线。`
      : `${mode === 'llm' ? 'AI' : '本地'}解析完成，已保存到稳定信息。`;
    return;
  }

  if (parsed.preferences.length > 0) {
    supplementMessage.value = '已保存到偏好标签。';
    return;
  }

  if (parsed.birthday) {
    supplementMessage.value = '已更新基础信息中的生日。';
    return;
  }

  supplementMessage.value = '没有识别到可保存的信息。';
}

async function saveSupplement(mode: 'rule' | 'llm'): Promise<void> {
  if (!friend.value || !quickNote.value.trim()) {
    return;
  }

  supplementMessage.value = '';
  supplementError.value = '';

  if (mode === 'llm') {
    aiSavingSupplement.value = true;
  } else {
    savingSupplement.value = true;
  }

  try {
    const parsed = mode === 'llm'
      ? await aiService.extractSupplement(friend.value, quickNote.value)
      : parseSupplementInput(quickNote.value);
    await applyParsedResult(parsed, mode);
  } catch (err) {
    supplementError.value = `保存失败：${(err as Error).message}`;
  } finally {
    if (mode === 'llm') {
      aiSavingSupplement.value = false;
    } else {
      savingSupplement.value = false;
    }
  }
}

function startEditField(field: CustomField): void {
  editingFieldId.value = field.id;
  fieldDraft.value = {
    label: field.label,
    value: field.value,
    eventTimeText: field.eventTimeText ?? '',
    includeInTimeline: field.includeInTimeline,
  };
}

function cancelEditField(): void {
  editingFieldId.value = null;
  busyFieldId.value = null;
  fieldDraft.value = {
    label: '',
    value: '',
    eventTimeText: '',
    includeInTimeline: false,
  };
}

async function saveFieldEdit(fieldId: string): Promise<void> {
  if (!friend.value || !fieldDraft.value.value.trim()) {
    return;
  }

  busyFieldId.value = fieldId;
  supplementMessage.value = '';
  supplementError.value = '';

  try {
    const currentId = friend.value.id;
    const nextFields: CustomField[] = friend.value.customFields.map((field) => {
      if (field.id !== fieldId) {
        return field;
      }

      const nextIncludeInTimeline = timelineItems.value.some((item) => item.id === fieldId)
        ? true
        : false;

      return {
        ...field,
        label: fieldDraft.value.label.trim() || field.label,
        value: fieldDraft.value.value.trim(),
        includeInTimeline: nextIncludeInTimeline,
        temporalScope: nextIncludeInTimeline ? ('timebound' as const) : ('stable' as const),
        eventTimeText: nextIncludeInTimeline ? fieldDraft.value.eventTimeText.trim() || undefined : undefined,
        sourceText: fieldDraft.value.value.trim(),
      };
    });

    await friendsStore.updateFriend(currentId, { customFields: nextFields });
    await refreshCurrentFriend(currentId);
    supplementMessage.value = '记录已更新。';
    cancelEditField();
  } catch (err) {
    supplementError.value = `更新失败：${(err as Error).message}`;
    busyFieldId.value = null;
  }
}

async function removeField(fieldId: string): Promise<void> {
  if (!friend.value || busyFieldId.value === fieldId) {
    return;
  }

  const confirmed = window.confirm('确认删除这条记录吗？');
  if (!confirmed) {
    return;
  }

  busyFieldId.value = fieldId;
  supplementMessage.value = '';
  supplementError.value = '';

  try {
    const currentId = friend.value.id;
    const nextFields = friend.value.customFields.filter((field) => field.id !== fieldId);
    await friendsStore.updateFriend(currentId, { customFields: nextFields });
    await refreshCurrentFriend(currentId);
    supplementMessage.value = '记录已删除。';
    if (editingFieldId.value === fieldId) {
      cancelEditField();
    } else {
      busyFieldId.value = null;
    }
  } catch (err) {
    supplementError.value = `删除失败：${(err as Error).message}`;
    busyFieldId.value = null;
  }
}

async function handleDelete(): Promise<void> {
  if (!friend.value || deleting.value) {
    return;
  }

  const confirmed = window.confirm(`确认删除 ${friend.value.name} 的档案吗？此操作不可撤销。`);
  if (!confirmed) {
    return;
  }

  deleting.value = true;

  try {
    await friendsStore.deleteFriend(friend.value.id);
    await router.push('/');
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.detail-screen {
  padding-bottom: 140px;
}

.field-hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}

.supplement-actions {
  margin-top: 14px;
}

.supplement-grid {
  grid-template-columns: 1fr 1fr;
}

.full-span {
  grid-column: 1 / -1;
}

.custom-fields-card {
  margin-top: 10px;
}

.custom-field-row {
  display: grid;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.custom-field-row:last-child {
  border-bottom: 0;
}

.record-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.custom-field-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  flex: 1;
}

.custom-field-meta strong {
  font-size: 14px;
}

.custom-field-meta span {
  font-size: 12px;
  color: var(--muted);
}

.custom-field-row > span:last-child {
  color: var(--muted);
  line-height: 1.55;
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

.danger-text {
  color: #a63a3a;
}

.record-editor {
  display: grid;
  gap: 10px;
  margin-top: 4px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(29, 40, 49, 0.04);
}

.record-editor input,
.record-editor textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
  color: var(--ink);
}

.record-editor textarea {
  resize: vertical;
}

.record-editor-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
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

.timeline-meta span {
  font-size: 12px;
  color: var(--muted);
}

.timeline-meta-top {
  margin-bottom: 6px;
}

.timeline-content p {
  margin-top: 6px;
  color: var(--muted);
  line-height: 1.6;
}

.timeline-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.timeline-tags span {
  font-size: 12px;
  color: var(--muted);
  background: rgba(29, 40, 49, 0.05);
  border-radius: 999px;
  padding: 6px 10px;
}

.timeline-actions {
  margin-top: 12px;
}

.timeline-editor {
  margin-top: 10px;
}

.success-message {
  color: #2f8a82;
  margin-top: 12px;
  font-size: 14px;
}

.error-message {
  color: var(--coral);
  margin-top: 12px;
  font-size: 14px;
}

.danger {
  background: rgba(255, 107, 107, 0.12);
  color: #a63a3a;
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
</style>




