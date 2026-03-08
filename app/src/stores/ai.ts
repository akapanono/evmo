import { defineStore } from 'pinia';
import { ref } from 'vue';
import { aiService } from '@/services/aiService';
import type { AskAIResult } from '@/services/aiService';
import type { Friend } from '@/types/friend';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const useAIStore = defineStore('ai', () => {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const followupSuggestions = ref<string[]>([]);
  const lowInfoMode = ref(false);

  async function askQuestion(friend: Friend, question: string): Promise<AskAIResult> {
    loading.value = true;
    error.value = null;
    followupSuggestions.value = [];
    lowInfoMode.value = false;

    messages.value.push({
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await aiService.askAI(friend, question);

      messages.value.push({
        role: 'assistant',
        content: result.content,
        timestamp: new Date().toISOString(),
      });
      followupSuggestions.value = result.suggestions;
      lowInfoMode.value = result.lowInfoMode;

      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '发生未知错误。';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearMessages(): void {
    messages.value = [];
    error.value = null;
    followupSuggestions.value = [];
    lowInfoMode.value = false;
  }

  function getDefaultQuestions(): string[] {
    return aiService.getDefaultQuestions();
  }

  return {
    messages,
    loading,
    error,
    followupSuggestions,
    lowInfoMode,
    askQuestion,
    clearMessages,
    getDefaultQuestions,
  };
});
