import type { Friend, Reminder, ContactLog } from '@/types/friend';
import type { AIConversation } from '@/types/api';

export interface DatabaseSchema {
  friends: {
    key: string;
    value: Friend;
    indexes: { 'by-createdAt': string; 'by-updatedAt': string };
  };
  reminders: {
    key: string;
    value: Reminder;
    indexes: { 'by-friendId': string; 'by-date': string };
  };
  contactLogs: {
    key: string;
    value: ContactLog;
    indexes: { 'by-friendId': string; 'by-date': string };
  };
  conversations: {
    key: string;
    value: AIConversation;
    indexes: { 'by-friendId': string };
  };
}
