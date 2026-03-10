import { getDB } from '@/database';
import type { AIConversation } from '@/types/api';
import type { ChatMessage } from '@/stores/ai';

function createConversation(friendId: string, messages: ChatMessage[] = []): AIConversation {
  const now = new Date().toISOString();

  return {
    id: friendId,
    friendId,
    messages,
    createdAt: now,
    updatedAt: now,
  };
}

export const aiConversationService = {
  async getConversation(friendId: string): Promise<AIConversation | undefined> {
    const db = await getDB();
    const conversation = await db.get('conversations', friendId);

    if (conversation) {
      return conversation;
    }

    const indexedConversations = await db.getAllFromIndex('conversations', 'by-friendId', friendId);
    return indexedConversations[0];
  },

  async getMessages(friendId: string): Promise<ChatMessage[]> {
    const conversation = await this.getConversation(friendId);
    return conversation?.messages ?? [];
  },

  async saveMessages(friendId: string, messages: ChatMessage[]): Promise<AIConversation> {
    const db = await getDB();
    const existing = await this.getConversation(friendId);
    const nextConversation: AIConversation = existing
      ? {
        ...existing,
        id: friendId,
        friendId,
        messages,
        updatedAt: new Date().toISOString(),
      }
      : createConversation(friendId, messages);

    await db.put('conversations', nextConversation);
    return nextConversation;
  },

  async clearConversation(friendId: string): Promise<void> {
    const db = await getDB();
    const existing = await this.getConversation(friendId);

    if (existing) {
      await db.delete('conversations', existing.id);
    }
  },
};
