<template>
  <section class="app-screen is-active">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">{{ isEdit ? '编辑朋友' : '添加朋友' }}</p>
        <h1>{{ isEdit ? '编辑档案' : '建立基础档案' }}</h1>
      </div>
    </div>

    <article class="form-card">
      <div class="field-grid">
        <label class="field">
          <span>姓名 *</span>
          <input v-model="form.name" type="text" placeholder="请输入姓名" />
        </label>
        <label class="field">
          <span>昵称</span>
          <input v-model="form.nickname" type="text" placeholder="请输入昵称" />
        </label>
        <label class="field">
          <span>关系 *</span>
          <input v-model="form.relationship" type="text" placeholder="如：大学同学、同事" />
        </label>
        <label class="field">
          <span>生日 (MM-DD)</span>
          <input v-model="form.birthday" type="text" placeholder="如：03-07" />
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
          <span>偏好 / 特点（用逗号分隔）</span>
          <input v-model="preferencesInput" type="text" placeholder="如：喜欢乌龙茶, 手作礼物" />
        </label>
      </div>
    </article>

    <article class="form-card soft-panel">
      <p class="mini-label">自定义信息</p>
      <textarea v-model="form.notes" rows="5" placeholder="记录其他想记住的信息..."></textarea>
    </article>

    <p v-if="errors.length > 0" class="error-message">
      {{ errors[0].message }}
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import type { Friend, AvatarColor } from '@/types/friend';
import { createEmptyFriend, AVATAR_COLORS } from '@/types/friend';
import { getAvatarColorFromName } from '@/utils/color';
import { validateFriend, type ValidationError } from '@/utils/validation';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();

const colors: AvatarColor[] = AVATAR_COLORS;
const saving = ref(false);
const errors = ref<ValidationError[]>([]);

const friendId = computed(() => route.params.id as string);
const isEdit = computed(() => !!friendId.value);

const form = ref<Friend>(createEmptyFriend());
const preferencesInput = ref('');

onMounted(async () => {
  await friendsStore.loadFriends();
  if (isEdit.value) {
    const existing = friendsStore.friends.find((f) => f.id === friendId.value);
    if (existing) {
      form.value = { ...existing };
      preferencesInput.value = existing.preferences.join(', ');
    }
  }
});

function goBack(): void {
  router.push('/');
}

async function handleSave(): Promise<void> {
  // 处理偏好
  form.value.preferences = preferencesInput.value
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // 如果没选颜色且有名字，自动生成
  if (form.value.name && !isEdit.value && !form.value.avatarColor) {
    form.value.avatarColor = getAvatarColorFromName(form.value.name);
  }

  // 验证
  errors.value = validateFriend(form.value);
  if (errors.value.length > 0) return;

  saving.value = true;
  try {
    if (isEdit.value) {
      await friendsStore.updateFriend(friendId.value, form.value);
    } else {
      await friendsStore.addFriend({ ...form.value });
    }
    router.push('/');
  } catch (err) {
    console.error(err);
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

.error-message {
  color: var(--coral);
  padding: 10px 0;
  font-size: 14px;
}
</style>
