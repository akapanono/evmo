<template>
  <section v-if="friend" class="app-screen is-active ask-screen">
    <div class="ask-layout">
      <div class="ask-header">
        <div class="topbar compact">
          <button class="back-link" type="button" @click="goBack">返回</button>
          <div class="topbar-title">
            <p class="eyebrow">AI 查询</p>
            <h1>问问 {{ friend.name }}</h1>
          </div>
        </div>

        <article class="ask-context-card">
          <p class="mini-label">AI 已读取这份朋友档案</p>
          <div class="tag-group compact-tags">
            <span v-for="tag in contextTags" :key="tag">{{ tag }}</span>
          </div>
        </article>

        <div v-if="!hasMessages" class="quick-questions starter-questions">
          <button
            v-for="preset in defaultQuestions"
            :key="preset"
            type="button"
            class="chip"
            @click="askPresetQuestion(preset)"
            :disabled="aiStore.loading"
          >
            {{ preset }}
          </button>
        </div>
      </div>

      <div ref="messagesContainer" class="messages-panel">
        <div v-if="!hasMessages" class="empty-chat-state">
          <p class="mini-label">开始提问</p>
          <h2>{{ defaultQuestions[0] }}</h2>
          <p>
            你可以像和朋友聊天一样连续提问。发送后，消息会以聊天气泡显示在这里。
          </p>
        </div>

        <div v-for="(msg, idx) in aiStore.messages" :key="`${msg.role}-${idx}-${msg.timestamp}`" class="bubble-row" :class="msg.role">
          <article class="message-bubble" :class="msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'">
            <p>{{ msg.content }}</p>
          </article>
        </div>

        <article v-if="aiStore.followupSuggestions.length > 0" class="suggestion-card">
          <p class="mini-label">建议补充</p>
          <p v-if="aiStore.lowInfoMode" class="suggestion-lead">这份档案信息还比较少，补充下面这些内容后，AI 会更像这位朋友本人。</p>
          <button
            v-if="aiStore.lowInfoMode"
            type="button"
            class="action-btn primary intake-link-btn"
            @click="goToProfileIntake"
          >
            进入引导补充
          </button>
          <div class="suggestion-list">
            <button
              v-for="suggestion in aiStore.followupSuggestions"
              :key="suggestion"
              type="button"
              class="suggestion-chip"
              @click="goToSupplementInput(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </article>

        <div v-if="aiStore.loading" class="bubble-row assistant">
          <article class="message-bubble assistant-bubble loading-bubble">
            <p>思考中...</p>
          </article>
        </div>
      </div>

      <div class="composer-dock">
        <p v-if="aiStore.error" class="error-message">
          {{ aiStore.error }}
        </p>

        <label class="chat-composer">
          <textarea
            v-model="question"
            rows="2"
            placeholder="输入你想对他说的话，例如：你最近在忙什么？"
            @keydown.enter.exact.prevent="handleSend"
            :disabled="aiStore.loading"
          ></textarea>
          <button
            type="button"
            class="send-btn"
            @click="handleSend"
            :disabled="!question.trim() || aiStore.loading"
          >
            {{ aiStore.loading ? '发送中' : '发送' }}
          </button>
        </label>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAIStore } from '@/stores/ai';
import { useFriendsStore } from '@/stores/friends';
import type { Friend } from '@/types/friend';

const route = useRoute();
const router = useRouter();
const friendsStore = useFriendsStore();
const aiStore = useAIStore();

const friend = ref<Friend | null>(null);
const question = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const defaultQuestions = aiStore.getDefaultQuestions();

const hasMessages = computed(() => aiStore.messages.length > 0);
const contextTags = computed(() => {
  if (!friend.value) {
    return [];
  }

  const tags: string[] = [];
  if (friend.value.birthday) tags.push('生日');
  if (friend.value.preferences.length > 0) tags.push('偏好');
  if (friend.value.customFields.some((field) => field.temporalScope === 'timebound')) tags.push('事件');
  if (friend.value.customFields.some((field) => field.temporalScope === 'stable')) tags.push('稳定信息');
  if (friend.value.aiProfile.overview || friend.value.aiProfile.traits.length > 0) tags.push('画像');
  if (friend.value.relationship) tags.push(friend.value.relationship);

  return tags.length > 0 ? tags : ['基础档案'];
});

onMounted(async () => {
  await friendsStore.loadFriends();
  const id = route.params.id as string;
  friend.value = friendsStore.friends.find((item) => item.id === id) ?? null;
  aiStore.clearMessages();
});

onBeforeUnmount(() => {
  aiStore.clearMessages();
});

watch(
  () => [aiStore.messages.length, aiStore.loading, aiStore.followupSuggestions.length],
  async () => {
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  },
  { deep: true },
);

async function askPresetQuestion(preset: string): Promise<void> {
  question.value = preset;
  await handleSend();
}

async function handleSend(): Promise<void> {
  if (!friend.value || !question.value.trim() || aiStore.loading) {
    return;
  }

  const currentQuestion = question.value.trim();
  question.value = '';

  try {
    await aiStore.askQuestion(friend.value, currentQuestion);
  } catch (err) {
    console.error(err);
  }
}

function goToSupplementInput(suggestion: string): void {
  if (!friend.value) {
    return;
  }

  router.push({
    name: 'friend-detail',
    params: { id: friend.value.id },
    query: { suggestion },
  });
}

function goToProfileIntake(): void {
  if (!friend.value) {
    return;
  }

  router.push({
    name: 'profile-intake',
    params: { id: friend.value.id },
    query: { returnTo: 'ask' },
  });
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
.ask-screen {
  inset: 48px 0 0;
  padding: 14px 18px 0;
  overflow: hidden;
}

.ask-layout {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 0;
}

.ask-header {
  display: grid;
  gap: 12px;
}

.messages-panel {
  min-height: 0;
  overflow-y: auto;
  padding: 14px 0 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-chat-state {
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
}

.empty-chat-state h2 {
  margin-top: 8px;
  font-size: 28px;
}

.empty-chat-state p:last-child {
  margin-top: 10px;
  color: var(--muted);
  line-height: 1.6;
}

.starter-questions {
  margin-top: 0;
}

.bubble-row {
  display: flex;
}

.bubble-row.user {
  justify-content: flex-end;
}

.bubble-row.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 82%;
  padding: 14px 16px;
  border-radius: 22px;
  box-shadow: 0 8px 22px rgba(29, 40, 49, 0.08);
}

.message-bubble p {
  margin: 0;
  line-height: 1.65;
}

.user-bubble {
  background: var(--ink);
  color: #fffaf4;
  border-bottom-right-radius: 8px;
}

.assistant-bubble {
  background: #fff;
  color: var(--ink);
  border: 1px solid var(--line);
  border-bottom-left-radius: 8px;
}

.loading-bubble {
  background: rgba(255, 255, 255, 0.88);
  color: var(--muted);
}

.suggestion-card {
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--line);
}

.suggestion-lead {
  margin-top: 8px;
  color: var(--muted);
  line-height: 1.6;
}

.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.intake-link-btn {
  margin-top: 12px;
}

.suggestion-chip {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(29, 40, 49, 0.08);
  color: var(--ink);
  text-align: left;
}

.composer-dock {
  margin-top: auto;
  padding: 10px 0 16px;
  background: linear-gradient(180deg, rgba(248, 240, 231, 0), rgba(248, 240, 231, 0.96) 24%, rgba(248, 240, 231, 1) 100%);
}

.chat-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  padding: 12px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  box-shadow: 0 12px 30px rgba(29, 40, 49, 0.08);
}

.chat-composer textarea {
  min-height: 64px;
  max-height: 120px;
  padding: 14px 16px;
  border-radius: 20px;
  line-height: 1.5;
  font-size: 15px;
}

.chat-composer textarea::placeholder {
  font-size: 14px;
  line-height: 1.45;
}

.send-btn {
  min-width: 68px;
  height: 52px;
  border-radius: 999px;
  background: var(--ink);
  color: #fffaf4;
  padding: 0 16px;
}

.send-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.error-message {
  color: var(--coral);
  text-align: center;
  padding: 0 10px 10px;
  font-size: 14px;
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
