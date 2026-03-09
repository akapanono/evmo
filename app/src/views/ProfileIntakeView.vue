<template>
  <section v-if="friend" class="app-screen is-active intake-screen">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="handleBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">资料补充</p>
        <h1>补充 {{ friend.name }} 的资料</h1>
      </div>
      <button class="icon-btn soft" type="button" @click="skipForNow">稍后</button>
    </div>

    <article class="profile-panel intake-hero">
      <p class="mini-label">第 {{ currentStep + 1 }} / {{ questions.length }} 项</p>
      <h2>{{ currentQuestion.title }}</h2>
      <p>{{ currentQuestion.prompt }}</p>
      <div class="progress-track" aria-hidden="true">
        <span class="progress-fill" :style="{ width: `${progressPercent}%` }"></span>
      </div>
    </article>

    <article class="question-card intake-card">
      <p class="mini-label">{{ currentQuestion.eyebrow }}</p>
      <textarea
        ref="answerInput"
        v-model="answers[currentQuestion.id]"
        rows="6"
        :placeholder="currentQuestion.placeholder"
      ></textarea>
      <p class="field-hint">{{ currentQuestion.hint }}</p>
    </article>

    <article class="ask-context-card summary-card">
      <p class="mini-label">为什么问这些</p>
      <p>这里优先补充相处方式、表达习惯和选择偏好。这些信息比基础字段更能帮助系统理解这个人本身。</p>
    </article>

    <div class="sticky-actions intake-actions">
      <button type="button" class="action-btn" @click="goPrev" :disabled="currentStep === 0 || saving">
        上一项
      </button>
      <button
        v-if="!isLastStep"
        type="button"
        class="action-btn"
        @click="goNext"
        :disabled="saving"
      >
        下一项
      </button>
      <button
        v-if="!isLastStep"
        type="button"
        class="action-btn primary"
        @click="skipCurrent"
        :disabled="saving"
      >
        跳过
      </button>
      <button
        v-else
        type="button"
        class="action-btn primary"
        @click="saveAnswers"
        :disabled="saving"
      >
        {{ saving ? '保存中...' : '写入档案' }}
      </button>
    </div>

    <p v-if="message" class="success-message">{{ message }}</p>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </section>

  <section v-else class="app-screen is-active">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="router.push('/')">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">错误</p>
        <h1>朋友不存在</h1>
      </div>
    </div>

    <article class="empty-state-card">
      <div class="empty-icon">:(</div>
      <h2>找不到这位朋友</h2>
      <p>该朋友可能已被删除，或者链接无效。</p>
      <button type="button" class="action-btn primary" @click="router.push('/')">
        返回首页
      </button>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { friendService } from '@/services/friendService';
import { useFriendsStore } from '@/stores/friends';
import type { Friend } from '@/types/friend';
import {
  PROFILE_INTAKE_QUESTIONS,
  applyProfileIntakeAnswers,
  createEmptyProfileIntakeAnswers,
  getProfileIntakeAnswersFromFriend,
} from '@/utils/profileIntake';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();

const friend = ref<Friend | null>(null);
const questions = PROFILE_INTAKE_QUESTIONS;
const fallbackQuestion = PROFILE_INTAKE_QUESTIONS[0]!;
const currentStep = ref(0);
const answers = ref(createEmptyProfileIntakeAnswers());
const saving = ref(false);
const message = ref('');
const errorMessage = ref('');
const answerInput = ref<HTMLTextAreaElement | null>(null);

const currentQuestion = computed((): typeof fallbackQuestion => questions[currentStep.value] ?? fallbackQuestion);
const isLastStep = computed(() => currentStep.value === questions.length - 1);
const progressPercent = computed(() => ((currentStep.value + 1) / questions.length) * 100);

onMounted(async () => {
  const id = route.params.id as string;
  await loadCurrentFriend(id);
  if (friend.value) {
    answers.value = getProfileIntakeAnswersFromFriend(friend.value);
  }
  await focusAnswer();
});

watch(
  () => route.params.id,
  async (nextId) => {
    if (typeof nextId === 'string' && nextId) {
      await loadCurrentFriend(nextId);
      if (friend.value) {
        answers.value = getProfileIntakeAnswersFromFriend(friend.value);
      }
    }
  },
);

watch(currentStep, async () => {
  message.value = '';
  errorMessage.value = '';
  await focusAnswer();
});

async function focusAnswer(): Promise<void> {
  await nextTick();
  answerInput.value?.focus();
  const value = answers.value[currentQuestion.value.id] ?? '';
  answerInput.value?.setSelectionRange(value.length, value.length);
}

function goPrev(): void {
  if (currentStep.value === 0) {
    return;
  }

  currentStep.value -= 1;
}

function goNext(): void {
  if (isLastStep.value) {
    return;
  }

  currentStep.value += 1;
}

function skipCurrent(): void {
  answers.value[currentQuestion.value.id] = '';
  goNext();
}

function getReturnRoute() {
  if (route.query.returnTo === 'ask' && friend.value) {
    return {
      name: 'ask-ai',
      params: { id: friend.value.id },
    };
  }

  if (friend.value) {
    return {
      name: 'friend-detail',
      params: { id: friend.value.id },
    };
  }

  return { name: 'home' as const };
}

function handleBack(): void {
  router.push(getReturnRoute());
}

function skipForNow(): void {
  router.push(getReturnRoute());
}

async function saveAnswers(): Promise<void> {
  if (!friend.value || saving.value) {
    return;
  }

  saving.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    const updates = applyProfileIntakeAnswers(friend.value, answers.value);
    await friendsStore.updateFriend(friend.value.id, updates);
    await friendsStore.loadFriends();
    friend.value = friendsStore.friends.find((item) => item.id === friend.value!.id) ?? friend.value;
    message.value = '资料已写入档案。';
    await router.push(getReturnRoute());
  } catch (err) {
    errorMessage.value = `保存失败：${(err as Error).message}`;
  } finally {
    saving.value = false;
  }
}

async function loadCurrentFriend(id: string): Promise<void> {
  await friendsStore.loadFriends();
  friend.value = friendsStore.friends.find((item) => item.id === id) ?? await friendService.getFriendById(id) ?? null;
}
</script>

<style scoped>
.intake-screen {
  padding-bottom: 136px;
}

.intake-hero,
.intake-card,
.summary-card {
  margin-top: 16px;
}

.progress-track {
  width: 100%;
  height: 8px;
  margin-top: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(29, 40, 49, 0.08);
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(47, 138, 130, 0.92), rgba(38, 64, 74, 0.92));
  transition: width 180ms ease;
}

.intake-card {
  display: grid;
  gap: 12px;
}

.intake-card textarea {
  min-height: 188px;
  resize: vertical;
}

.field-hint {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.summary-card p:last-child {
  margin-top: 8px;
  line-height: 1.6;
}

.intake-actions {
  margin-top: 18px;
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
