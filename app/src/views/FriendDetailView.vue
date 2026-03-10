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

    <section class="section-block">
      <div class="section-head">
        <h3>分身资料</h3>
      </div>
      <article class="ask-context-card intake-entry-card">
        <p class="mini-label">资料补充</p>
        <p>除了基础信息，还可以继续补充相处方式、表达习惯和选择偏好。这些内容会影响分身回答时的语气和判断。</p>
        <button type="button" class="action-btn primary intake-entry-btn" @click="openProfileIntake">
          继续补充
        </button>
      </article>
    </section>

    <section ref="supplementSection" class="section-block">
      <div class="section-head">
        <h3>一句话补充信息</h3>
      </div>
      <article class="form-card soft-panel">
        <textarea
          ref="supplementTextarea"
          v-model="quickNote"
          rows="3"
          placeholder="每行写一条，例如：
他最近在准备考研
她下周要出差
她不喜欢香菜"
          :disabled="isSubmittingSupplement"
        ></textarea>
        <p class="field-hint">
          可以直接写自然语言。系统会尽量把内容整理到基础信息、偏好和事件中。
        </p>
        <div class="detail-actions supplement-actions supplement-grid">
          <button type="button" class="action-btn" @click="quickNote = ''" :disabled="isSubmittingSupplement || !quickNote.trim()">
            清空
          </button>
          <button type="button" class="action-btn" @click="saveSupplement('llm')" :disabled="isSubmittingSupplement || !quickNote.trim()">
            {{ aiSavingSupplement ? '整理中...' : 'AI 整理后保存' }}
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
        <InfoRow label="性别">
          {{ friend.gender || '-' }}
        </InfoRow>
        <InfoRow label="年龄">
          {{ friend.age ?? '-' }}
        </InfoRow>
        <InfoRow label="身高">
          {{ friend.heightCm ? `${friend.heightCm} cm` : '-' }}
        </InfoRow>
        <InfoRow label="体重">
          {{ friend.weightKg ? `${friend.weightKg} kg` : '-' }}
        </InfoRow>
        <InfoRow label="常住城市">
          {{ friend.city || '-' }}
        </InfoRow>
        <InfoRow label="家乡">
          {{ friend.hometown || '-' }}
        </InfoRow>
        <InfoRow label="职业">
          {{ friend.occupation || '-' }}
        </InfoRow>
        <InfoRow label="公司">
          {{ friend.company || '-' }}
        </InfoRow>
        <InfoRow label="学校">
          {{ friend.school || '-' }}
        </InfoRow>
        <InfoRow label="专业">
          {{ friend.major || '-' }}
        </InfoRow>
      </article>
      <article class="info-card custom-basic-card">
        <div class="section-inline-head">
          <p class="mini-label">自定义基础信息</p>
          <button type="button" class="more-link" @click="toggleBasicInfoCreator">
            {{ showBasicInfoCreator ? '收起' : '新增' }}
          </button>
        </div>

        <div v-if="showBasicInfoCreator" class="record-editor basic-info-editor">
          <input v-model="basicInfoDraft.label" type="text" placeholder="词条名，例如：宠物、籍贯、爱用品牌" />
          <input v-model="basicInfoDraft.value" type="text" placeholder="词条内容" />
          <div class="record-editor-actions">
            <button type="button" class="mini-action" @click="resetBasicInfoDraft">取消</button>
            <button type="button" class="mini-action solid" @click="saveNewBasicInfoField" :disabled="!basicInfoDraft.label.trim() || !basicInfoDraft.value.trim() || busyBasicInfoId === '__creating__'">
              保存
            </button>
          </div>
        </div>

        <div v-if="friend.basicInfoFields.length > 0" class="custom-basic-list">
          <div v-for="field in friend.basicInfoFields" :key="field.id" class="custom-field-row">
            <div class="record-head">
              <div class="custom-field-meta">
                <strong>{{ field.label }}</strong>
              </div>
              <div class="record-actions">
                <button type="button" class="mini-action" @click="startEditBasicInfo(field)">编辑</button>
                <button type="button" class="mini-action danger-text" @click="removeBasicInfoField(field.id)" :disabled="busyBasicInfoId === field.id">删除</button>
              </div>
            </div>

            <div v-if="editingBasicInfoId === field.id" class="record-editor basic-info-editor">
              <input v-model="basicInfoDraft.label" type="text" placeholder="词条名" />
              <input v-model="basicInfoDraft.value" type="text" placeholder="词条内容" />
              <div class="record-editor-actions">
                <button type="button" class="mini-action" @click="cancelEditBasicInfo">取消</button>
                <button type="button" class="mini-action solid" @click="saveExistingBasicInfoField(field.id)" :disabled="busyBasicInfoId === field.id || !basicInfoDraft.label.trim() || !basicInfoDraft.value.trim()">
                  保存
                </button>
              </div>
            </div>
            <span v-else class="clamped-text">{{ field.value }}</span>
          </div>
        </div>
        <p v-else-if="!showBasicInfoCreator" class="field-hint">还没有自定义基础信息。</p>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>补充信息</h3>
        <div v-if="hasSupplementContent" class="section-actions">
          <button v-if="friend.preferences.length > 0" type="button" class="more-link" @click="togglePreferenceEditMode">
            {{ preferenceEditMode ? '完成' : '编辑' }}
          </button>
          <button v-if="hasSupplementOverflow" type="button" class="more-link" @click="openRecordList('stable')">
            更多
          </button>
        </div>
      </div>
      <article v-if="friend.preferences.length > 0" class="custom-card">
        <p class="mini-label">偏好标签</p>
        <div class="tag-group compact-tags compact-tags-preview">
          <div v-for="pref in friend.preferences" :key="pref" class="editable-tag">
            <span>{{ pref }}</span>
            <button
              v-if="preferenceEditMode"
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
      </article>

      <article v-if="stableFields.length > 0" class="info-card custom-fields-card">
        <p class="mini-label">稳定信息</p>
        <div v-for="field in stableFields.slice(0, stablePreviewLimit)" :key="field.id" class="custom-field-row">
          <div class="record-head">
            <div v-if="showStableFieldTitle(field)" class="custom-field-meta">
              <strong>{{ field.label }}</strong>
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
          <span v-else class="clamped-text">{{ field.value }}</span>
        </div>
      </article>

      <article v-if="friend.preferences.length === 0 && stableFields.length === 0" class="note-card">
        <p>还没有补充信息。</p>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>记录时间线</h3>
        <button v-if="timelineItems.length > timelinePreviewLimit" type="button" class="more-link" @click="openRecordList('timeline')">
          更多
        </button>
      </div>
      <article v-if="timelineItems.length > 0" class="info-card timeline-card">
        <div v-for="item in timelineItems.slice(0, timelinePreviewLimit)" :key="item.id" class="timeline-item">
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
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import InfoRow from '@/components/friend/InfoRow.vue';
import { useFriendsStore } from '@/stores/friends';
import { aiService } from '@/services/aiService';
import type { Friend, CustomField, SemanticType } from '@/types/friend';
import type { SemanticExtractionResult } from '@/types/extraction';
import { formatBirthday, formatDate } from '@/utils/dateHelpers';
import { parseSupplementInput } from '@/utils/semantic';
import { PROFILE_INTAKE_FIELD_LABELS } from '@/utils/profileIntake';
import { applyBasicInfoExtraction, removeBasicInfoField as pruneBasicInfoField, upsertBasicInfoField } from '@/utils/basicInfo';

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
const editingBasicInfoId = ref<string | null>(null);
const busyBasicInfoId = ref<string | null>(null);
const showBasicInfoCreator = ref(false);
const preferenceEditMode = ref(false);
const busyPreferenceValue = ref<string | null>(null);
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
const stablePreviewLimit = 3;
const timelinePreviewLimit = 3;
const fieldDraft = ref({
  label: '',
  value: '',
  eventTimeText: '',
  includeInTimeline: false,
});
const basicInfoDraft = ref({
  label: '',
  value: '',
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

    if (Object.values(PROFILE_INTAKE_FIELD_LABELS).includes(field.label as (typeof PROFILE_INTAKE_FIELD_LABELS)[keyof typeof PROFILE_INTAKE_FIELD_LABELS])) {
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

const hasSupplementContent = computed(() => Boolean(friend.value && (friend.value.preferences.length > 0 || stableFields.value.length > 0)));
const hasSupplementOverflow = computed(() => {
  if (!friend.value) {
    return false;
  }

  return stableFields.value.length > stablePreviewLimit || friend.value.preferences.length > 6;
});

onMounted(async () => {
  const id = route.params.id as string;
  await loadCurrentFriend(id);
  await applySuggestionFromRoute();
});

watch(
  () => route.params.id,
  async (nextId) => {
    if (typeof nextId === 'string' && nextId) {
      await loadCurrentFriend(nextId);
    }
  },
);

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

function openProfileIntake(): void {
  if (!friend.value) {
    return;
  }

  router.push({
    name: 'profile-intake',
    params: { id: friend.value.id },
  });
}

function openRecordList(section: 'stable' | 'timeline'): void {
  if (!friend.value) {
    return;
  }

  router.push({
    name: 'friend-record-list',
    params: { id: friend.value.id, section },
  });
}

function togglePreferenceEditMode(): void {
  preferenceEditMode.value = !preferenceEditMode.value;
}

function toggleBasicInfoCreator(): void {
  showBasicInfoCreator.value = !showBasicInfoCreator.value;
  if (!showBasicInfoCreator.value) {
    resetBasicInfoDraft();
  }
}

function resetBasicInfoDraft(): void {
  basicInfoDraft.value = {
    label: '',
    value: '',
  };
  editingBasicInfoId.value = null;
  busyBasicInfoId.value = null;
}

function startEditBasicInfo(field: Friend['basicInfoFields'][number]): void {
  editingBasicInfoId.value = field.id;
  showBasicInfoCreator.value = false;
  basicInfoDraft.value = {
    label: field.label,
    value: field.value,
  };
}

function cancelEditBasicInfo(): void {
  resetBasicInfoDraft();
}

function showStableFieldTitle(field: CustomField): boolean {
  const normalizedLabel = field.label.trim();
  if (!normalizedLabel) {
    return false;
  }

  return normalizedLabel !== semanticTypeText(field.semanticType);
}

async function loadCurrentFriend(id: string): Promise<void> {
  if (friendsStore.friends.length === 0) {
    await friendsStore.loadFriends();
  }

  friend.value = await friendsStore.getFriendById(id) ?? null;

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
  if (personaRefreshInFlightId.value === id) {
    return;
  }

  personaRefreshInFlightId.value = id;
  try {
    const updated = await friendsStore.refreshFriendPersona(id);
    if (updated) {
      friend.value = updated;
    }
  } catch {
    // Keep the current fallback persona when AI refresh fails.
  } finally {
    if (personaRefreshInFlightId.value === id) {
      personaRefreshInFlightId.value = null;
    }
  }
}

function queuePersonaRefresh(id: string): void {
  void refreshPersonaFromAI(id);
}

function splitSupplementLines(value: string): string[] {
  return value
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mergeParsedResults(results: SemanticExtractionResult[], rawText: string): SemanticExtractionResult {
  const preferenceSet = new Set<string>();
  const basicInfoFields = [] as SemanticExtractionResult['basicInfoFields'];
  const records = [] as SemanticExtractionResult['records'];
  let birthday: string | undefined;

  for (const result of results) {
    if (result.birthday) {
      birthday = result.birthday;
    }

    for (const pref of result.preferences) {
      preferenceSet.add(pref);
    }

    basicInfoFields.push(...result.basicInfoFields);
    records.push(...result.records);
  }

  return {
    birthday,
    preferences: Array.from(preferenceSet),
    basicInfoFields,
    records,
    noteLine: rawText,
    rawText,
  };
}

async function removePreference(value: string): Promise<void> {
  if (!friend.value || busyPreferenceValue.value === value) {
    return;
  }

  busyPreferenceValue.value = value;
  supplementMessage.value = '';
  supplementError.value = '';

  try {
    const currentId = friend.value.id;
    const nextPreferences = friend.value.preferences.filter((item) => item !== value);
    const updated = await friendsStore.updateFriend(currentId, { preferences: nextPreferences });
    if (updated) {
      friend.value = updated;
    }
    queuePersonaRefresh(currentId);
    if (nextPreferences.length === 0) {
      preferenceEditMode.value = false;
    }
    supplementMessage.value = '偏好标签已删除。';
  } catch (err) {
    supplementError.value = `删除失败：${(err as Error).message}`;
  } finally {
    busyPreferenceValue.value = null;
  }
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
  ];

  const currentId = friend.value.id;
  const basicInfoUpdates = applyBasicInfoExtraction(friend.value, parsed.basicInfoFields);
  const updated = await friendsStore.updateFriend(currentId, {
    birthday: parsed.birthday ?? friend.value.birthday,
    preferences: Array.from(existingPreferenceSet),
    gender: basicInfoUpdates.gender,
    age: basicInfoUpdates.age,
    heightCm: basicInfoUpdates.heightCm,
    weightKg: basicInfoUpdates.weightKg,
    city: basicInfoUpdates.city,
    hometown: basicInfoUpdates.hometown,
    occupation: basicInfoUpdates.occupation,
    company: basicInfoUpdates.company,
    school: basicInfoUpdates.school,
    major: basicInfoUpdates.major,
    basicInfoFields: basicInfoUpdates.basicInfoFields,
    customFields: nextFields,
  });
  if (updated) {
    friend.value = updated;
  }
  queuePersonaRefresh(currentId);
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

  if (parsed.basicInfoFields.length > 0) {
    supplementMessage.value = '已保存到基础信息。';
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
      ? await aiService.extractSupplement(friend.value, quickNote.value.trim())
      : mergeParsedResults(
        splitSupplementLines(quickNote.value).map((line) => parseSupplementInput(line)),
        quickNote.value.trim(),
      );
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

async function saveBasicInfoField(fieldId?: string): Promise<void> {
  if (!friend.value || !basicInfoDraft.value.label.trim() || !basicInfoDraft.value.value.trim()) {
    return;
  }

  busyBasicInfoId.value = fieldId ?? '__creating__';
  supplementMessage.value = '';
  supplementError.value = '';

  try {
    const currentId = friend.value.id;
    const nextBasicInfoFields = upsertBasicInfoField(friend.value.basicInfoFields, {
      label: basicInfoDraft.value.label,
      value: basicInfoDraft.value.value,
    }, fieldId);
    const updated = await friendsStore.updateFriend(currentId, { basicInfoFields: nextBasicInfoFields });
    if (updated) {
      friend.value = updated;
    }
    queuePersonaRefresh(currentId);
    supplementMessage.value = '基础信息已更新。';
    resetBasicInfoDraft();
    showBasicInfoCreator.value = false;
  } catch (err) {
    supplementError.value = `保存失败：${(err as Error).message}`;
    busyBasicInfoId.value = null;
  }
}

async function saveNewBasicInfoField(): Promise<void> {
  await saveBasicInfoField();
}

async function saveExistingBasicInfoField(fieldId: string): Promise<void> {
  await saveBasicInfoField(fieldId);
}

async function removeBasicInfoField(fieldId: string): Promise<void> {
  if (!friend.value || busyBasicInfoId.value === fieldId) {
    return;
  }

  openConfirmDialog({
    eyebrow: '删除基础信息',
    title: '确认删除这条基础信息？',
    message: '删除后不会保留在基础信息区域。',
    confirmText: '删除',
    cancelText: '保留',
    danger: true,
    onConfirm: async () => {
      busyBasicInfoId.value = fieldId;
      supplementMessage.value = '';
      supplementError.value = '';

      try {
        const currentId = friend.value!.id;
        const nextBasicInfoFields = pruneBasicInfoField(friend.value!.basicInfoFields, fieldId);
        const updated = await friendsStore.updateFriend(currentId, { basicInfoFields: nextBasicInfoFields });
        if (updated) {
          friend.value = updated;
        }
        queuePersonaRefresh(currentId);
        supplementMessage.value = '基础信息已删除。';
        if (editingBasicInfoId.value === fieldId) {
          resetBasicInfoDraft();
        } else {
          busyBasicInfoId.value = null;
        }
      } catch (err) {
        supplementError.value = `删除失败：${(err as Error).message}`;
        busyBasicInfoId.value = null;
      }
    },
  });
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

    const updated = await friendsStore.updateFriend(currentId, { customFields: nextFields });
    if (updated) {
      friend.value = updated;
    }
    queuePersonaRefresh(currentId);
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

  openConfirmDialog({
    eyebrow: '删除记录',
    title: '确认删除这条记录？',
    message: '删除后不会保留到时间线或补充信息中。',
    confirmText: '删除',
    cancelText: '保留',
    danger: true,
    onConfirm: async () => {
      busyFieldId.value = fieldId;
      supplementMessage.value = '';
      supplementError.value = '';

      try {
        const currentId = friend.value!.id;
        const nextFields = friend.value!.customFields.filter((field) => field.id !== fieldId);
        const updated = await friendsStore.updateFriend(currentId, { customFields: nextFields });
        if (updated) {
          friend.value = updated;
        }
        queuePersonaRefresh(currentId);
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
    },
  });
}

async function handleDelete(): Promise<void> {
  if (!friend.value || deleting.value) {
    return;
  }

  openConfirmDialog({
    eyebrow: '删除档案',
    title: `确认删除 ${friend.value.name} 的档案？`,
    message: '此操作不可撤销，相关补充信息和时间线也会一起删除。',
    confirmText: '删除档案',
    cancelText: '取消',
    danger: true,
    onConfirm: async () => {
      deleting.value = true;

      try {
        await friendsStore.deleteFriend(friend.value!.id);
        await router.push('/');
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

.field-hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.section-inline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.section-head {
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

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}

.intake-entry-card p:last-of-type {
  margin-top: 8px;
}

.intake-entry-btn {
  margin-top: 14px;
  width: 100%;
}

.ai-profile-card {
  display: grid;
  gap: 14px;
}

.ai-profile-group {
  display: grid;
  gap: 8px;
}

.custom-basic-card {
  margin-top: 10px;
}

.custom-basic-list {
  display: grid;
  gap: 0;
}

.basic-info-editor input {
  width: 100%;
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

.soft-panel > textarea {
  min-height: 148px;
}

.custom-fields-card {
  margin-top: 10px;
}

.compact-tags-preview {
  max-height: 152px;
  overflow: hidden;
}

.editable-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 0;
  border-radius: 999px;
  background: rgba(29, 40, 49, 0.06);
}

.editable-tag > span {
  padding: 9px 10px 9px 14px;
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
  flex: 0 0 auto;
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
  justify-content: flex-start;
  gap: 12px;
  align-items: baseline;
  flex: 1;
}

.custom-field-meta strong {
  font-size: 14px;
}

.custom-field-row > span:last-child {
  color: var(--muted);
  line-height: 1.55;
}

.clamped-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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
