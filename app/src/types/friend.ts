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

export interface BasicInfoField {
  id: string;
  label: string;
  value: string;
  createdAt: string;
  sourceText: string;
}

export interface FriendAIPersona {
  overview: string;
  signals: string[];
  traits: string[];
  tasteProfile: string[];
  interactionStyle: string[];
  inferenceHints: string[];
  boundaries: string[];
  updatedAt: string;
  source?: 'rule' | 'llm';
}

export interface Friend {
  id: string;
  name: string;
  nickname?: string;
  relationship: string;
  birthday?: string;
  gender?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  city?: string;
  hometown?: string;
  occupation?: string;
  company?: string;
  school?: string;
  major?: string;
  avatarColor: AvatarColor;
  lastContactDate?: string;
  isImportant: boolean;
  preferences: string[];
  notes: string;
  basicInfoFields: BasicInfoField[];
  customFields: CustomField[];
  aiProfile: FriendAIPersona;
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

export function createEmptyAIPersona(updatedAt = new Date().toISOString()): FriendAIPersona {
  return {
    overview: '',
    signals: [],
    traits: [],
    tasteProfile: [],
    interactionStyle: [],
    inferenceHints: [],
    boundaries: [],
    updatedAt,
    source: 'rule',
  };
}

export function createEmptyFriend(): Friend {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: '',
    nickname: '',
    relationship: '',
    birthday: undefined,
    gender: '',
    age: undefined,
    heightCm: undefined,
    weightKg: undefined,
    city: '',
    hometown: '',
    occupation: '',
    company: '',
    school: '',
    major: '',
    avatarColor: 'coral',
    lastContactDate: undefined,
    isImportant: false,
    preferences: [],
    notes: '',
    basicInfoFields: [],
    customFields: [],
    aiProfile: createEmptyAIPersona(now),
    createdAt: now,
    updatedAt: now,
    contactCount: 0,
  };
}
