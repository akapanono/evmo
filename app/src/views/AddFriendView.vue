<template>
  <section class="app-screen is-active">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">{{ isEdit ? '编辑朋友' : '添加朋友' }}</p>
        <h1>{{ isEdit ? '更新档案' : '建立基础档案' }}</h1>
      </div>
    </div>

    <article class="form-card">
      <div class="field-grid">
        <label class="field">
          <span>姓名 *</span>
          <input v-model="form.name" type="text" placeholder="请输入朋友姓名" />
        </label>
        <label class="field">
          <span>昵称</span>
          <input v-model="form.nickname" type="text" placeholder="例如：小王、Ada" />
        </label>
        <label class="field">
          <span>关系 *</span>
          <input v-model="form.relationship" type="text" placeholder="例如：大学同学、同事、发小" />
        </label>
        <label class="field">
          <span>生日 (MM-DD)</span>
          <input v-model="form.birthday" type="text" inputmode="numeric" placeholder="例如：03-07" />
        </label>
      </div>
    </article>

    <article class="form-card">
      <div class="field-grid">
        <label class="field">
          <span>头像颜色</span>
          <div class="color-picker">
            <button
              v-for="color in colors"
              :key="color"
              type="button"
              :class="['color-option', color, { active: form.avatarColor === color }]"
              @click="form.avatarColor = color"
            ></button>
          </div>
        </label>

        <label class="field">
          <span>偏好 / 特点</span>
          <input v-model="preferencesInput" type="text" placeholder="例如：喜欢乌龙茶，不吃香菜、手作礼物" />
          <small class="field-tip">支持逗号、顿号、分号或换行分隔</small>
        </label>
      </div>
    </article>

    <article class="form-card soft-panel">
      <p class="mini-label">补充信息</p>
      <textarea v-model="supplementInput" rows="5" placeholder="例如：她下周要出差
他最近在准备考研
她不吃香菜"></textarea>
      <p class="field-tip">这里的内容会在保存时自动分发到基础信息、偏好标签、稳定信息和时间线。</p>
    </article>

    <p v-if="errors.length > 0" class="error-message">
      {{ errors[0]?.message }}
    </p>

    <div class="sticky-actions">
      <button type="button" class="action-btn" @click="goBack">取消</button>
      <button type="button" class="action-btn primary" @click="handleSave" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import { AVATAR_COLORS, createEmptyFriend } from '@/types/friend';
import type { AvatarColor, Friend, CustomField } from '@/types/friend';
import { getAvatarColorFromName } from '@/utils/color';
import { validateFriend, type ValidationError } from '@/utils/validation';
import { parseSupplementInput } from '@/utils/semantic';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();

const colors: AvatarColor[] = AVATAR_COLORS;
const saving = ref(false);
const errors = ref<ValidationError[]>([]);

const friendId = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => Boolean(friendId.value));

const form = ref<Friend>(createEmptyFriend());
const preferencesInput = ref('');
const supplementInput = ref('');

onMounted(async () => {
  await friendsStore.loadFriends();

  if (!isEdit.value || !friendId.value) {
    return;
  }

  const existing = friendsStore.friends.find((item) => item.id === friendId.value);
  if (!existing) {
    errors.value = [{ field: 'general', message: '未找到要编辑的朋友档案。' }];
    return;
  }

  form.value = {
    ...existing,
    customFields: [...existing.customFields],
    preferences: [...existing.preferences],
  };
  preferencesInput.value = existing.preferences.join('，');
  supplementInput.value = '';
});

function goBack(): void {
  if (isEdit.value && friendId.value) {
    router.push(`/friend/${friendId.value}`);
    return;
  }

  router.push('/');
}

function normalizeBirthday(value: string | undefined): string | undefined {
  const birthday = value?.trim();
  return birthday ? birthday : undefined;
}

function splitTokens(value: string): string[] {
  return value
    .split(/[，,、；;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePreferences(value: string): string[] {
  return splitTokens(value);
}

function parseSupplementLines(value: string): string[] {
  return value
    .split(/[\n；;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeUnique(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function buildCustomFieldRecord(field: CustomField | Omit<CustomField, 'id' | 'createdAt'>, createdAt: string): CustomField {
  return {
    id: 'id' in field ? field.id : crypto.randomUUID(),
    createdAt: 'createdAt' in field ? field.createdAt : createdAt,
    label: field.label,
    value: field.value,
    includeInTimeline: field.includeInTimeline,
    semanticType: field.semanticType,
    temporalScope: field.temporalScope,
    extractionMethod: field.extractionMethod,
    sourceText: field.sourceText,
    eventTimeText: field.eventTimeText,
  };
}

function applySupplementToForm(base: Friend, rawSupplement: string): Friend {
  const segments = parseSupplementLines(rawSupplement);
  if (segments.length === 0) {
    return {
      ...base,
      preferences: mergeUnique(base.preferences),
      customFields: [...base.customFields],
    };
  }

  const preferencePool = [...base.preferences];
  let nextBirthday = base.birthday;
  const createdAt = new Date().toISOString();
  const nextFields = [...base.customFields];

  for (const segment of segments) {
    const parsed = parseSupplementInput(segment);

    if (parsed.birthday) {
      nextBirthday = parsed.birthday;
    }

    if (parsed.preferences.length > 0) {
      preferencePool.push(...parsed.preferences);
    }

    if (parsed.records.length > 0) {
      nextFields.unshift(
        ...parsed.records.map((field) => buildCustomFieldRecord({
          label: field.label,
          value: field.value,
          includeInTimeline: field.includeInTimeline,
          semanticType: field.semanticType,
          temporalScope: field.temporalScope,
          extractionMethod: field.extractionMethod,
          sourceText: field.sourceText,
          eventTimeText: field.eventTimeText,
        }, createdAt)),
      );
    }
  }

  return {
    ...base,
    birthday: nextBirthday,
    preferences: mergeUnique(preferencePool),
    customFields: nextFields.slice(0, 20),
    notes: '',
  };
}

async function handleSave(): Promise<void> {
  errors.value = [];

  let nextForm: Friend = {
    ...form.value,
    name: form.value.name.trim(),
    nickname: form.value.nickname?.trim(),
    relationship: form.value.relationship.trim(),
    birthday: normalizeBirthday(form.value.birthday),
    preferences: normalizePreferences(preferencesInput.value),
    notes: '',
  };

  nextForm = applySupplementToForm(nextForm, supplementInput.value);

  if (!isEdit.value && nextForm.name && nextForm.avatarColor === 'coral') {
    nextForm.avatarColor = getAvatarColorFromName(nextForm.name);
  }

  errors.value = validateFriend(nextForm);
  if (errors.value.length > 0) {
    return;
  }

  saving.value = true;

  try {
    if (isEdit.value && friendId.value) {
      await friendsStore.updateFriend(friendId.value, nextForm);
      await router.push(`/friend/${friendId.value}`);
      return;
    }

    const created = await friendsStore.addFriend({ ...nextForm });
    await router.push(`/friend/${created.id}`);
  } catch (err) {
    errors.value = [{ field: 'general', message: `保存失败：${(err as Error).message}` }];
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.color-picker {
  display: flex;
  gap: 10px;
  padding: 4px 0;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 3px solid transparent;
  cursor: pointer;
}

.color-option.coral {
  background: var(--coral);
}

.color-option.teal {
  background: var(--teal);
}

.color-option.gold {
  background: var(--gold);
}

.color-option.ink {
  background: var(--ink-soft);
}

.color-option.active {
  border-color: var(--ink);
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--ink);
}

.field-tip {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

.error-message {
  color: var(--coral);
  padding: 10px 0;
  font-size: 14px;
}
</style>
