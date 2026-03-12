<template>
  <section v-if="friend" class="app-screen is-active supplement-screen">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">一句话补充</p>
        <h1>补充 {{ friend.name }}</h1>
      </div>
    </div>

    <article class="form-card soft-panel supplement-card">
      <textarea
        ref="supplementTextarea"
        v-model="quickNote"
        rows="5"
        placeholder="例如：
喜欢吃烧烤，喜欢喝啤酒，下周要去香港"
        :disabled="isSubmittingSupplement"
      ></textarea>
      <p class="field-hint">
        可以直接写自然语言。系统会尽量拆成基础信息、偏好、补充信息和时间线记录。
      </p>

      <div class="supplement-actions">
        <button type="button" class="action-btn" @click="quickNote = ''" :disabled="isSubmittingSupplement || !quickNote.trim()">
          清空
        </button>
        <button type="button" class="action-btn" @click="saveSupplement('llm')" :disabled="isSubmittingSupplement || !quickNote.trim()">
          {{ aiSavingSupplement ? '整理中...' : 'AI 整理后保存' }}
        </button>
        <button type="button" class="action-btn primary" @click="saveSupplement('rule')" :disabled="isSubmittingSupplement || !quickNote.trim()">
          {{ savingSupplement ? '保存中...' : '直接保存' }}
        </button>
      </div>

      <p v-if="message" class="success-message">{{ message }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </article>
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
import { nextTick, onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import { aiService } from '@/services/aiService';
import { parseSupplementInputBatch } from '@/utils/semantic';
import type { Friend } from '@/types/friend';
import type { SemanticExtractionResult } from '@/types/extraction';
import { applyBasicInfoExtraction } from '@/utils/basicInfo';
import { getFriendBackPath, getFriendDetailRoute, getFriendSourcePageFromRoute } from '@/utils/friendNavigation';
import { buildPreferenceItemsFromValues, extractCategorizedPreferenceItems, flattenPreferenceItems, getFriendPreferenceItems } from '@/utils/preferences';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();

const friend = ref<Friend | null>(null);
const quickNote = ref('');
const supplementTextarea = ref<HTMLTextAreaElement | null>(null);
const savingSupplement = ref(false);
const aiSavingSupplement = ref(false);
const message = ref('');
const errorMessage = ref('');
const sourcePage = computed(() => getFriendSourcePageFromRoute(route));

const isSubmittingSupplement = computed(() => savingSupplement.value || aiSavingSupplement.value);

onMounted(async () => {
  const id = route.params.id as string;
  await loadCurrentFriend(id);
  if (typeof route.query.suggestion === 'string') {
    quickNote.value = route.query.suggestion.trim();
  }
  await nextTick();
  supplementTextarea.value?.focus();
});

function goBack(): void {
  if (!friend.value) {
    router.push(getFriendBackPath(sourcePage.value));
    return;
  }

  router.push(getFriendDetailRoute(friend.value.id, sourcePage.value));
}

async function loadCurrentFriend(id: string): Promise<void> {
  await friendsStore.loadFriends();
  friend.value = await friendsStore.getFriendById(id) ?? null;
}

async function applyParsedResult(parsed: SemanticExtractionResult, mode: 'rule' | 'llm', rawText: string): Promise<void> {
  if (!friend.value) {
    return;
  }

  const existingPreferenceItems = getFriendPreferenceItems(friend.value);
  const explicitPreferenceItems = extractCategorizedPreferenceItems(rawText, existingPreferenceItems);
  const explicitValueSet = new Set(explicitPreferenceItems.map((item) => item.value));
  const inferredPreferenceItems = buildPreferenceItemsFromValues(
    parsed.preferences.filter((pref) => !explicitValueSet.has(pref)),
    existingPreferenceItems,
  );
  const nextPreferenceItems = [
    ...existingPreferenceItems,
    ...explicitPreferenceItems,
    ...inferredPreferenceItems,
  ];

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

  const basicInfoUpdates = applyBasicInfoExtraction(friend.value, parsed.basicInfoFields);
  const updated = await friendsStore.updateFriend(friend.value.id, {
    birthday: parsed.birthday ?? friend.value.birthday,
    preferenceItems: nextPreferenceItems,
    preferences: flattenPreferenceItems(nextPreferenceItems),
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

  quickNote.value = '';
  if (parsed.records.length > 0) {
    message.value = parsed.records.some((field) => field.includeInTimeline)
      ? `${mode === 'llm' ? 'AI' : '本地'}解析完成，已加入时间线。`
      : `${mode === 'llm' ? 'AI' : '本地'}解析完成，已保存到补充信息。`;
    return;
  }

  if (parsed.preferences.length > 0 || explicitPreferenceItems.length > 0) {
    message.value = '已保存到偏好标签。';
    return;
  }

  if (parsed.basicInfoFields.length > 0 || parsed.birthday) {
    message.value = '已保存到基础信息。';
    return;
  }

  message.value = '没有识别到可保存的信息。';
}

async function saveSupplement(mode: 'rule' | 'llm'): Promise<void> {
  if (!friend.value || !quickNote.value.trim()) {
    return;
  }

  message.value = '';
  errorMessage.value = '';

  if (mode === 'llm') {
    aiSavingSupplement.value = true;
  } else {
    savingSupplement.value = true;
  }

  try {
    const parsed = mode === 'llm'
      ? await aiService.extractSupplement(friend.value, quickNote.value.trim())
      : parseSupplementInputBatch(quickNote.value.trim());
    await applyParsedResult(parsed, mode, quickNote.value.trim());
  } catch (err) {
    errorMessage.value = `保存失败：${(err as Error).message}`;
  } finally {
    if (mode === 'llm') {
      aiSavingSupplement.value = false;
    } else {
      savingSupplement.value = false;
    }
  }
}
</script>

<style scoped>
.supplement-screen {
  padding-bottom: 140px;
}

.supplement-card {
  margin-top: 18px;
}

.supplement-card textarea {
  min-height: 180px;
}

.field-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.supplement-actions {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.success-message,
.error-message {
  margin-top: 12px;
  font-size: 14px;
}

.success-message {
  color: #2f8a82;
}

.error-message {
  color: var(--coral);
}

@media (max-width: 520px) {
  .supplement-actions {
    grid-template-columns: 1fr;
  }
}
</style>
