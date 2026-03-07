export interface AIRequest {
  friendId: string;
  question: string;
}

export interface AIResponse {
  answer: string;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  friendId: string;
  messages: AIChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
