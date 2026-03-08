export type SemanticType = 'preference' | 'restriction' | 'status' | 'event' | 'milestone' | 'note';
export type TemporalScope = 'stable' | 'timebound';
export type ExtractionMethod = 'rule' | 'llm' | 'manual';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  createdAt: string;
  includeInTimeline: boolean;
  semanticType: SemanticType;
  temporalScope: TemporalScope;
  extractionMethod: ExtractionMethod;
  sourceText: string;
  eventTimeText?: string;
}

export type AvatarColor = 'coral' | 'teal' | 'gold' | 'ink';

export interface Friend {
  id: string;
  name: string;
  nickname?: string;
  relationship: string;
  birthday?: string;
  avatarColor: AvatarColor;
  lastContactDate?: string;
  isImportant: boolean;
  preferences: string[];
  notes: string;
  customFields: CustomField[];
  createdAt: string;
  updatedAt: string;
  contactCount: number;
}

export interface Reminder {
  id: string;
  friendId: string;
  type: 'birthday' | 'contact' | 'custom';
  title: string;
  date: string;
  isActive: boolean;
}

export interface ContactLog {
  id: string;
  friendId: string;
  date: string;
  notes?: string;
  type: 'call' | 'message' | 'meeting' | 'other';
}

export const AVATAR_COLORS: AvatarColor[] = ['coral', 'teal', 'gold', 'ink'];

export function createEmptyFriend(): Friend {
  return {
    id: crypto.randomUUID(),
    name: '',
    nickname: '',
    relationship: '',
    birthday: undefined,
    avatarColor: 'coral',
    lastContactDate: undefined,
    isImportant: false,
    preferences: [],
    notes: '',
    customFields: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contactCount: 0,
  };
}
