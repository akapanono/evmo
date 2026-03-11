import { defineStore } from 'pinia';
import { ref } from 'vue';
import { aiConversationService } from '@/services/aiConversationService';
import { aiService } from '@/services/aiService';
import type { AskAIResult } from '@/services/aiService';
import type { Friend } from '@/types/friend';

export interface ChatMessage {
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
  const activeFriendId = ref<string | null>(null);

  async function loadConversation(friendId: string): Promise<void> {
    activeFriendId.value = friendId;
    messages.value = [];
    error.value = null;
    followupSuggestions.value = [];
    lowInfoMode.value = false;
    messages.value = await aiConversationService.getMessages(friendId);
  }

  async function persistMessages(friendId: string): Promise<void> {
    await aiConversationService.saveMessages(friendId, messages.value);
  }

  async function askQuestion(friend: Friend, question: string): Promise<AskAIResult> {
    loading.value = true;
    error.value = null;
    followupSuggestions.value = [];
    lowInfoMode.value = false;
    activeFriendId.value = friend.id;

    try {
      const history = messages.value.slice(-12);
      const runtimeContextPromise = aiService.prepareAskRuntimeContext();

      messages.value.push({
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      });
      await persistMessages(friend.id);

      const assistantIndex = messages.value.push({
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }) - 1;

      const runtimeContext = await runtimeContextPromise;
      const result = await aiService.askAIStream(friend, question, history, runtimeContext, (chunk) => {
        const assistantMessage = messages.value[assistantIndex];
        if (!assistantMessage) {
          return;
        }

        assistantMessage.content += chunk;
      });

      if (messages.value[assistantIndex]) {
        messages.value[assistantIndex].content = result.content;
      }
      followupSuggestions.value = result.suggestions;
      lowInfoMode.value = result.lowInfoMode;
      await persistMessages(friend.id);

      return result;
    } catch (err) {
      const lastMessage = messages.value[messages.value.length - 1];
      if (lastMessage?.role === 'assistant' && !lastMessage.content.trim()) {
        messages.value.pop();
      }

      try {
        await persistMessages(friend.id);
      } catch {
        // Ignore persistence failures here so the primary AI error can surface.
      }

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
    activeFriendId.value = null;
  }

  async function clearConversation(friendId?: string): Promise<void> {
    const targetFriendId = friendId ?? activeFriendId.value;
    if (!targetFriendId) {
      clearMessages();
      return;
    }

    await aiConversationService.clearConversation(targetFriendId);
    if (activeFriendId.value === targetFriendId) {
      clearMessages();
    }
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
    activeFriendId,
    loadConversation,
    askQuestion,
    clearMessages,
    clearConversation,
    getDefaultQuestions,
  };
});
