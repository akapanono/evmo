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
      <p class="mini-label">基础身份</p>
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
        <label class="field">
          <span>性别</span>
          <input v-model="form.gender" type="text" placeholder="例如：男、女、非二元" />
        </label>
        <label class="field">
          <span>年龄</span>
          <input v-model="ageInput" type="text" inputmode="numeric" placeholder="例如：26" />
        </label>
      </div>
    </article>

    <article class="form-card">
      <p class="mini-label">更多基础信息</p>
      <div class="field-grid">
        <label class="field">
          <span>身高 (cm)</span>
          <input v-model="heightInput" type="text" inputmode="decimal" placeholder="例如：178" />
        </label>
        <label class="field">
          <span>体重 (kg)</span>
          <input v-model="weightInput" type="text" inputmode="decimal" placeholder="例如：68" />
        </label>
        <label class="field">
          <span>常住城市</span>
          <input v-model="form.city" type="text" placeholder="例如：上海" />
        </label>
        <label class="field">
          <span>家乡</span>
          <input v-model="form.hometown" type="text" placeholder="例如：杭州" />
        </label>
        <label class="field">
          <span>职业</span>
          <input v-model="form.occupation" type="text" placeholder="例如：产品经理" />
        </label>
        <label class="field">
          <span>公司</span>
          <input v-model="form.company" type="text" placeholder="例如：某互联网公司" />
        </label>
        <label class="field">
          <span>学校</span>
          <input v-model="form.school" type="text" placeholder="例如：复旦大学" />
        </label>
        <label class="field">
          <span>专业</span>
          <input v-model="form.major" type="text" placeholder="例如：新闻学" />
        </label>
      </div>
    </article>

    <article class="form-card">
      <div class="section-inline-head">
        <p class="mini-label">自定义基础信息</p>
        <button type="button" class="small ghost-btn" @click="addBasicInfoDraft">新增词条</button>
      </div>
      <div v-if="basicInfoDrafts.length > 0" class="field-grid basic-info-grid">
        <div v-for="field in basicInfoDrafts" :key="field.id" class="basic-info-row">
          <input v-model="field.label" type="text" placeholder="词条名，例如：宠物、籍贯、常去的店" />
          <input v-model="field.value" type="text" placeholder="词条内容" />
          <button type="button" class="mini-remove-btn" @click="removeBasicInfoDraft(field.id)">删除</button>
        </div>
      </div>
      <p v-else class="field-tip">如果默认基础信息不够用，可以自己加词条。</p>
    </article>

    <article class="form-card">
      <div class="field-grid">
        <div class="field avatar-field">
          <span>头像预览</span>
          <div class="avatar-editor">
            <Avatar
              size="xxl"
              :color="form.avatarColor"
              :preset="form.avatarPreset"
              :image-src="form.avatarImage"
            >
              {{ form.name?.trim().charAt(0) || '友' }}
            </Avatar>

            <div class="avatar-upload-actions">
              <button type="button" class="small ghost-btn upload-avatar-btn" @click="triggerAvatarUpload">上传头像</button>
              <button
                v-if="form.avatarImage"
                type="button"
                class="small ghost-btn"
                @click="clearAvatarImage"
              >
                清除图片
              </button>
            </div>
            <input ref="avatarInput" class="hidden-avatar-input" type="file" accept="image/*" @change="handleAvatarChange" />
          </div>

          <span class="field-subtitle">头像颜色</span>
          <div class="color-picker">
            <button
              v-for="color in colors"
              :key="color"
              type="button"
              :class="['color-option', color, { active: form.avatarColor === color }]"
              @click="form.avatarColor = color"
            ></button>
          </div>

          <span class="field-subtitle">头像样式</span>
          <div class="preset-picker">
            <button
              v-for="preset in avatarPresets"
              :key="preset"
              type="button"
              :class="['preset-option', { active: form.avatarPreset === preset }]"
              @click="form.avatarPreset = preset"
            >
              <Avatar size="md" :color="form.avatarColor" :preset="preset" />
            </button>
          </div>
        </div>

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
她家乡在杭州"></textarea>
      <p class="field-tip">这里的内容会在保存时自动分发到基础信息、时间线、偏好和稳定信息里。更抽象的人物画像可以在保存后进入引导补充页继续完善。</p>
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

    <ConfirmDialog
      :open="showCancelDialog"
      eyebrow="取消编辑"
      title="放弃这次修改？"
      :message="cancelDialogMessage"
      confirm-text="放弃"
      cancel-text="继续编辑"
      :danger="true"
      @confirm="confirmLeave"
      @cancel="showCancelDialog = false"
    />

    <div v-if="cropState.open" class="crop-overlay">
      <div class="crop-dialog">
        <div class="crop-head">
          <div>
            <p class="mini-label">头像裁剪</p>
            <h3>裁成正方形</h3>
          </div>
        </div>

        <div class="crop-stage">
          <div class="crop-frame">
            <img
              ref="cropImage"
              :src="cropState.source"
              alt=""
              class="crop-preview-image"
              :style="cropImageStyle"
              @load="handleCropImageLoad"
              @pointerdown.prevent="startCropDrag"
            />
          </div>
        </div>

        <label class="field crop-slider-field">
          <span>缩放</span>
          <input v-model="cropState.zoom" type="range" min="1" max="3" step="0.01" @input="clampCropOffset" />
        </label>

        <div class="crop-actions">
          <button type="button" class="action-btn" @click="cancelCrop">取消</button>
          <button type="button" class="action-btn primary" @click="applyCrop">应用裁剪</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Avatar from '@/components/common/Avatar.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { friendService } from '@/services/friendService';
import { useFriendsStore } from '@/stores/friends';
import { AVATAR_COLORS, AVATAR_PRESETS, createEmptyFriend } from '@/types/friend';
import type { AvatarColor, AvatarPreset, BasicInfoField, CustomField, Friend } from '@/types/friend';
import { getAvatarColorFromName } from '@/utils/color';
import { applyBasicInfoExtraction } from '@/utils/basicInfo';
import { parseSupplementInputBatch } from '@/utils/semantic';
import { validateFriend, type ValidationError } from '@/utils/validation';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();

const colors: AvatarColor[] = AVATAR_COLORS;
const avatarPresets: AvatarPreset[] = AVATAR_PRESETS;
const saving = ref(false);
const errors = ref<ValidationError[]>([]);
const showCancelDialog = ref(false);
const avatarInput = ref<HTMLInputElement | null>(null);
const cropImage = ref<HTMLImageElement | null>(null);
const cropState = ref({
  open: false,
  source: '',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  baseScale: 1,
  naturalWidth: 0,
  naturalHeight: 0,
});
const cropDrag = ref({
  active: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
});

const friendId = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => Boolean(friendId.value));
const cancelDialogMessage = computed(() =>
  isEdit.value ? '你还没有保存当前修改，离开后这次编辑会丢失。' : '你还没有保存这份档案，离开后当前填写内容会丢失。',
);

const form = ref<Friend>(createEmptyFriend());
const preferencesInput = ref('');
const supplementInput = ref('');
const ageInput = ref('');
const heightInput = ref('');
const weightInput = ref('');
const basicInfoDrafts = ref<Array<{ id: string; label: string; value: string }>>([]);
const initialSnapshot = ref('');

const isDirty = computed(() => buildDraftSnapshot() !== initialSnapshot.value);
const cropImageStyle = computed(() => ({
  transform: `translate(${cropState.value.offsetX}px, ${cropState.value.offsetY}px) scale(${cropState.value.baseScale * cropState.value.zoom})`,
}));

onMounted(async () => {
  await friendsStore.loadFriends();

  if (!isEdit.value || !friendId.value) {
    initialSnapshot.value = buildDraftSnapshot();
    return;
  }

  const existing = friendsStore.friends.find((item) => item.id === friendId.value)
    ?? await friendService.getFriendById(friendId.value);
  if (!existing) {
    errors.value = [{ field: 'general', message: '未找到要编辑的朋友档案。' }];
    return;
  }

  form.value = {
    ...existing,
    basicInfoFields: [...existing.basicInfoFields],
    customFields: [...existing.customFields],
    preferences: [...existing.preferences],
  };
  preferencesInput.value = existing.preferences.join('，');
  supplementInput.value = '';
  ageInput.value = existing.age !== undefined ? String(existing.age) : '';
  heightInput.value = existing.heightCm !== undefined ? String(existing.heightCm) : '';
  weightInput.value = existing.weightKg !== undefined ? String(existing.weightKg) : '';
  basicInfoDrafts.value = existing.basicInfoFields.map((field) => ({
    id: field.id,
    label: field.label,
    value: field.value,
  }));
  initialSnapshot.value = buildDraftSnapshot();
});

function goBack(): void {
  if (saving.value) {
    return;
  }

  if (isDirty.value) {
    showCancelDialog.value = true;
    return;
  }

  leaveCurrentPage();
}

function leaveCurrentPage(): void {
  if (isEdit.value && friendId.value) {
    router.push({
      name: 'friend-detail',
      params: { id: friendId.value },
    });
    return;
  }

  router.push('/');
}

function confirmLeave(): void {
  showCancelDialog.value = false;
  leaveCurrentPage();
}

function normalizeBirthday(value: string | undefined): string | undefined {
  const birthday = value?.trim();
  return birthday ? birthday : undefined;
}

function normalizeNumberInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasInvalidNumberInput(value: string): boolean {
  return value.trim().length > 0 && normalizeNumberInput(value) === undefined;
}

function normalizeTextInput(value: string | undefined): string {
  return value?.trim() ?? '';
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

function addBasicInfoDraft(): void {
  basicInfoDrafts.value.push({
    id: crypto.randomUUID(),
    label: '',
    value: '',
  });
}

function triggerAvatarUpload(): void {
  avatarInput.value?.click();
}

async function handleAvatarChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  cropState.value = {
    open: true,
    source: dataUrl,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    baseScale: 1,
    naturalWidth: 0,
    naturalHeight: 0,
  };
  input.value = '';
}

function clearAvatarImage(): void {
  form.value.avatarImage = undefined;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('头像读取失败'));
    reader.readAsDataURL(file);
  });
}

function handleCropImageLoad(): void {
  if (!cropImage.value) {
    return;
  }

  const { naturalWidth, naturalHeight } = cropImage.value;
  const viewport = 260;
  const baseScale = Math.max(viewport / naturalWidth, viewport / naturalHeight);

  cropState.value.naturalWidth = naturalWidth;
  cropState.value.naturalHeight = naturalHeight;
  cropState.value.baseScale = baseScale;
  cropState.value.offsetX = 0;
  cropState.value.offsetY = 0;
}

function startCropDrag(event: PointerEvent): void {
  cropDrag.value = {
    active: true,
    startX: event.clientX,
    startY: event.clientY,
    originX: cropState.value.offsetX,
    originY: cropState.value.offsetY,
  };

  window.addEventListener('pointermove', onCropDragMove);
  window.addEventListener('pointerup', stopCropDrag);
  window.addEventListener('pointercancel', stopCropDrag);
}

function onCropDragMove(event: PointerEvent): void {
  if (!cropDrag.value.active) {
    return;
  }

  cropState.value.offsetX = cropDrag.value.originX + event.clientX - cropDrag.value.startX;
  cropState.value.offsetY = cropDrag.value.originY + event.clientY - cropDrag.value.startY;
  clampCropOffset();
}

function stopCropDrag(): void {
  cropDrag.value.active = false;
  window.removeEventListener('pointermove', onCropDragMove);
  window.removeEventListener('pointerup', stopCropDrag);
  window.removeEventListener('pointercancel', stopCropDrag);
}

function clampCropOffset(): void {
  const viewport = 260;
  const scaledWidth = cropState.value.naturalWidth * cropState.value.baseScale * cropState.value.zoom;
  const scaledHeight = cropState.value.naturalHeight * cropState.value.baseScale * cropState.value.zoom;
  const maxOffsetX = Math.max(0, (scaledWidth - viewport) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - viewport) / 2);

  cropState.value.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, cropState.value.offsetX));
  cropState.value.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, cropState.value.offsetY));
}

function cancelCrop(): void {
  stopCropDrag();
  cropState.value.open = false;
}

function applyCrop(): void {
  const viewport = 260;
  const output = 512;
  const canvas = document.createElement('canvas');
  canvas.width = output;
  canvas.height = output;
  const ctx = canvas.getContext('2d');
  if (!ctx || !cropState.value.source) {
    cancelCrop();
    return;
  }

  const scale = cropState.value.baseScale * cropState.value.zoom;
  const cropWidth = viewport / scale;
  const cropHeight = viewport / scale;
  const sx = (cropState.value.naturalWidth - cropWidth) / 2 - cropState.value.offsetX / scale;
  const sy = (cropState.value.naturalHeight - cropHeight) / 2 - cropState.value.offsetY / scale;

  const image = new Image();
  image.onload = () => {
    ctx.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, output, output);
    form.value.avatarImage = canvas.toDataURL('image/jpeg', 0.92);
    cropState.value.open = false;
  };
  image.src = cropState.value.source;
}

function removeBasicInfoDraft(id: string): void {
  basicInfoDrafts.value = basicInfoDrafts.value.filter((field) => field.id !== id);
}

function buildBasicInfoFields(): BasicInfoField[] {
  return basicInfoDrafts.value
    .map((field) => ({
      id: field.id,
      label: field.label.trim(),
      value: field.value.trim(),
      createdAt: new Date().toISOString(),
      sourceText: field.value.trim(),
    }))
    .filter((field) => field.label && field.value);
}

function buildDraftSnapshot(): string {
  return JSON.stringify({
    name: form.value.name.trim(),
    nickname: normalizeTextInput(form.value.nickname),
    relationship: form.value.relationship.trim(),
    birthday: normalizeBirthday(form.value.birthday) ?? '',
    gender: normalizeTextInput(form.value.gender),
    age: ageInput.value.trim(),
    heightCm: heightInput.value.trim(),
    weightKg: weightInput.value.trim(),
    city: normalizeTextInput(form.value.city),
    hometown: normalizeTextInput(form.value.hometown),
    occupation: normalizeTextInput(form.value.occupation),
    company: normalizeTextInput(form.value.company),
    school: normalizeTextInput(form.value.school),
    major: normalizeTextInput(form.value.major),
    basicInfoFields: basicInfoDrafts.value
      .map((field) => ({ label: field.label.trim(), value: field.value.trim() }))
      .filter((field) => field.label && field.value)
      .sort((a, b) => `${a.label}${a.value}`.localeCompare(`${b.label}${b.value}`)),
    avatarColor: form.value.avatarColor,
    avatarPreset: form.value.avatarPreset,
    avatarImage: form.value.avatarImage ?? '',
    preferences: normalizePreferences(preferencesInput.value),
    supplement: supplementInput.value.trim(),
    customFields: form.value.customFields
      .map((field) => ({
        label: field.label.trim(),
        value: field.value.trim(),
        includeInTimeline: field.includeInTimeline,
        semanticType: field.semanticType,
        temporalScope: field.temporalScope,
        eventTimeText: field.eventTimeText?.trim() ?? '',
      }))
      .sort((a, b) => `${a.label}${a.value}`.localeCompare(`${b.label}${b.value}`)),
  });
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
      basicInfoFields: [...base.basicInfoFields],
      customFields: [...base.customFields],
    };
  }

  const preferencePool = [...base.preferences];
  let nextBirthday = base.birthday;
  let nextGender = base.gender;
  let nextAge = base.age;
  let nextHeightCm = base.heightCm;
  let nextWeightKg = base.weightKg;
  let nextCity = base.city;
  let nextHometown = base.hometown;
  let nextOccupation = base.occupation;
  let nextCompany = base.company;
  let nextSchool = base.school;
  let nextMajor = base.major;
  let nextBasicInfoFields = [...base.basicInfoFields];
  const createdAt = new Date().toISOString();
  const nextFields = [...base.customFields];

  for (const segment of segments) {
    const parsed = parseSupplementInputBatch(segment);

    if (parsed.birthday) {
      nextBirthday = parsed.birthday;
    }

    if (parsed.preferences.length > 0) {
      preferencePool.push(...parsed.preferences);
    }

    if (parsed.basicInfoFields.length > 0) {
      const basicInfoUpdates = applyBasicInfoExtraction({
        ...base,
        basicInfoFields: nextBasicInfoFields,
      }, parsed.basicInfoFields);

      nextBasicInfoFields = basicInfoUpdates.basicInfoFields ?? nextBasicInfoFields;
      if (basicInfoUpdates.gender !== undefined) nextGender = basicInfoUpdates.gender;
      if (basicInfoUpdates.age !== undefined) nextAge = basicInfoUpdates.age;
      if (basicInfoUpdates.heightCm !== undefined) nextHeightCm = basicInfoUpdates.heightCm;
      if (basicInfoUpdates.weightKg !== undefined) nextWeightKg = basicInfoUpdates.weightKg;
      if (basicInfoUpdates.city !== undefined) nextCity = basicInfoUpdates.city;
      if (basicInfoUpdates.hometown !== undefined) nextHometown = basicInfoUpdates.hometown;
      if (basicInfoUpdates.occupation !== undefined) nextOccupation = basicInfoUpdates.occupation;
      if (basicInfoUpdates.company !== undefined) nextCompany = basicInfoUpdates.company;
      if (basicInfoUpdates.school !== undefined) nextSchool = basicInfoUpdates.school;
      if (basicInfoUpdates.major !== undefined) nextMajor = basicInfoUpdates.major;
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
    gender: nextGender,
    age: nextAge,
    heightCm: nextHeightCm,
    weightKg: nextWeightKg,
    city: nextCity,
    hometown: nextHometown,
    occupation: nextOccupation,
    company: nextCompany,
    school: nextSchool,
    major: nextMajor,
    preferences: mergeUnique(preferencePool),
    basicInfoFields: nextBasicInfoFields.slice(0, 20),
    customFields: nextFields.slice(0, 30),
    notes: '',
  };
}

async function handleSave(): Promise<void> {
  errors.value = [];

  if (hasInvalidNumberInput(ageInput.value)) {
    errors.value = [{ field: 'age', message: '年龄需要填写数字。' }];
    return;
  }

  if (hasInvalidNumberInput(heightInput.value)) {
    errors.value = [{ field: 'heightCm', message: '身高需要填写数字。' }];
    return;
  }

  if (hasInvalidNumberInput(weightInput.value)) {
    errors.value = [{ field: 'weightKg', message: '体重需要填写数字。' }];
    return;
  }

  let nextForm: Friend = {
    ...form.value,
    name: form.value.name.trim(),
    nickname: normalizeTextInput(form.value.nickname),
    relationship: form.value.relationship.trim(),
    birthday: normalizeBirthday(form.value.birthday),
    gender: normalizeTextInput(form.value.gender),
    age: normalizeNumberInput(ageInput.value),
    heightCm: normalizeNumberInput(heightInput.value),
    weightKg: normalizeNumberInput(weightInput.value),
    city: normalizeTextInput(form.value.city),
    hometown: normalizeTextInput(form.value.hometown),
    occupation: normalizeTextInput(form.value.occupation),
    company: normalizeTextInput(form.value.company),
    school: normalizeTextInput(form.value.school),
    major: normalizeTextInput(form.value.major),
    basicInfoFields: buildBasicInfoFields(),
    avatarPreset: form.value.avatarPreset,
    avatarImage: form.value.avatarImage,
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
      initialSnapshot.value = buildDraftSnapshot();
      await router.push({
        name: 'friend-detail',
        params: { id: friendId.value },
      });
      return;
    }

    const created = await friendsStore.addFriend({ ...nextForm });
    initialSnapshot.value = buildDraftSnapshot();
    await router.push({
      name: 'profile-intake',
      params: { id: created.id },
      query: { from: 'create' },
    });
  } catch (err) {
    errors.value = [{ field: 'general', message: `保存失败：${(err as Error).message}` }];
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.avatar-field {
  display: grid;
  gap: 12px;
  align-content: start;
}

.avatar-editor {
  display: grid;
  justify-items: start;
  gap: 10px;
}

.avatar-upload-actions {
  width: fit-content;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.upload-avatar-btn {
  align-self: flex-start;
}

.hidden-avatar-input {
  display: none;
}

.field-subtitle {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.color-picker {
  display: flex;
  gap: 10px;
  padding: 2px 0 4px;
  flex-wrap: wrap;
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

.color-option.rose {
  background: #c06778;
}

.color-option.sky {
  background: #5b90cc;
}

.color-option.sage {
  background: #76926d;
}

.color-option.plum {
  background: var(--plum);
}

.color-option.mint {
  background: var(--mint);
}

.color-option.apricot {
  background: var(--apricot);
}

.color-option.berry {
  background: var(--berry);
}

.color-option.olive {
  background: var(--olive);
}

.color-option.ocean {
  background: var(--ocean);
}

.color-option.active {
  border-color: var(--ink);
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--ink);
}

.preset-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.preset-option {
  border: 2px solid transparent;
  border-radius: 16px;
  background: rgba(29, 40, 49, 0.04);
  padding: 6px;
}

.preset-option.active {
  border-color: var(--ink);
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(29, 40, 49, 0.14);
}

.crop-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(29, 40, 49, 0.28);
  backdrop-filter: blur(6px);
}

.crop-dialog {
  width: min(420px, 100%);
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 252, 247, 0.98);
  border: 1px solid var(--line);
}

.crop-stage {
  display: flex;
  justify-content: center;
}

.crop-frame {
  width: 260px;
  height: 260px;
  overflow: hidden;
  border-radius: 28px;
  background: rgba(29, 40, 49, 0.08);
  box-shadow: inset 0 0 0 1px rgba(29, 40, 49, 0.08);
  position: relative;
}

.crop-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255, 250, 244, 0.9);
  border-radius: 28px;
  pointer-events: none;
}

.crop-preview-image {
  width: 260px;
  height: 260px;
  object-fit: cover;
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.crop-slider-field {
  display: grid;
  gap: 8px;
}

.crop-actions {
  display: flex;
  gap: 12px;
}

.crop-actions .action-btn {
  flex: 1;
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

.section-inline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.basic-info-grid {
  gap: 10px;
}

.basic-info-row {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr) auto;
  gap: 10px;
  align-items: center;
}

.ghost-btn {
  background: rgba(29, 40, 49, 0.06);
  color: var(--ink);
}

.mini-remove-btn {
  border: 0;
  border-radius: 999px;
  background: rgba(255, 107, 107, 0.12);
  color: #a63a3a;
  padding: 10px 12px;
}
</style>
