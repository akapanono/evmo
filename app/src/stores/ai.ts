import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Friend } from '@/types/friend';
import { aiService } from '@/services/aiService';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const useAIStore = defineStore('ai', () => {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function askQuestion(friend: Friend, question: string): Promise<string> {
    loading.value = true;
    error.value = null;

    // 添加用户消息
    messages.value.push({
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    });

    try {
      const answer = await aiService.askAI(friend, question);

      // 添加 AI 回复
      messages.value.push({
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
      });

      return answer;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '发生未知错误';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearMessages(): void {
    messages.value = [];
    error.value = null;
  }

  function getDefaultQuestions(): string[] {
    return aiService.getDefaultQuestions();
  }

  return {
    messages,
    loading,
    error,
    askQuestion,
    clearMessages,
    getDefaultQuestions,
  };
});
