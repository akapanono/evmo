<template>
  <section class="app-screen is-active" v-if="friend">
    <div class="topbar compact">
      <button class="back-link" type="button" @click="goBack">返回</button>
      <div class="topbar-title">
        <p class="eyebrow">AI 查询</p>
        <h1>问问 {{ friend.name }}</h1>
      </div>
    </div>

    <article class="ask-context-card">
      <p class="mini-label">AI 已读取该朋友档案</p>
      <div class="tag-group compact-tags">
        <span>生日</span>
        <span>偏好</span>
        <span>禁忌</span>
        <span>近期状态</span>
        <span>历史记录</span>
      </div>
    </article>

    <div v-for="(msg, idx) in aiStore.messages" :key="idx" class="message-list">
      <article v-if="msg.role === 'user'" class="question-card">
        <p class="mini-label">你的问题</p>
        <h2>{{ msg.content }}</h2>
      </article>
      <article v-else class="answer-card warm-answer">
        <p class="mini-label">AI 回答</p>
        <p>{{ msg.content }}</p>
      </article>
    </div>

    <article v-if="!hasMessages" class="question-card">
      <p class="mini-label">试试问</p>
      <h2>她最近适合聊什么？</h2>
    </article>

    <article v-if="!hasMessages" class="answer-card warm-answer">
      <p class="mini-label">AI 可以帮你</p>
      <p>
        基于 {{ friend.name }} 的档案，AI 可以给你建议聊天话题、礼物推荐、联系时机等。
        点击下方快捷问题，或者输入你自己的问题。
      </p>
    </article>

    <div class="quick-questions">
      <button
        v-for="question in defaultQuestions"
        :key="question"
        type="button"
        class="chip"
        @click="askQuestion(question)"
        :disabled="aiStore.loading"
      >
        {{ question }}
      </button>
    </div>

    <label class="composer fixed-composer">
      <input
        v-model="question"
        type="text"
        placeholder="输入自然语言问题，例如：她不喜欢什么？"
        @keyup.enter="handleSend"
        :disabled="aiStore.loading"
      />
      <button
        type="button"
        class="primary small"
        @click="handleSend"
        :disabled="!question.trim() || aiStore.loading"
      >
        {{ aiStore.loading ? '思考中...' : '发送' }}
      </button>
    </label>

    <p v-if="aiStore.error" class="error-message">
      {{ aiStore.error }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFriendsStore } from '@/stores/friends';
import { useAIStore } from '@/stores/ai';
import type { Friend } from '@/types/friend';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();
const aiStore = useAIStore();

const friend = ref<Friend | null>(null);
const question = ref('');
const defaultQuestions = aiStore.getDefaultQuestions();

const hasMessages = computed(() => aiStore.messages.length > 0);

onMounted(async () => {
  await friendsStore.loadFriends();
  const id = route.params.id as string;
  friend.value = friendsStore.friends.find((f) => f.id === id) || null;
  aiStore.clearMessages();
});

async function askQuestion(q: string): Promise<void> {
  if (!friend.value) return;
  question.value = q;
  await handleSend();
}

async function handleSend(): Promise<void> {
  if (!friend.value || !question.value.trim() || aiStore.loading) return;

  try {
    await aiStore.askQuestion(friend.value, question.value);
    question.value = '';
  } catch (err) {
    console.error(err);
  }
}

function goBack(): void {
  if (friend.value) {
    router.push(`/friend/${friend.value.id}`);
  } else {
    router.push('/');
  }
}
</script>

<style scoped>
.message-list {
  margin-top: 10px;
}

.error-message {
  color: var(--coral);
  text-align: center;
  padding: 10px;
  font-size: 14px;
}
</style>
