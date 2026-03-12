export type SemanticType = 'preference' | 'restriction' | 'status' | 'event' | 'milestone' | 'note';
export type TemporalScope = 'stable' | 'timebound';
export type ExtractionMethod = 'rule' | 'llm' | 'manual';
export type PreferenceCategory = 'food' | 'entertainment' | 'lifestyle' | 'social' | 'travel' | 'shopping' | 'other';

export interface PreferenceItem {
  id: string;
  category: PreferenceCategory;
  value: string;
}

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

export type AvatarColor =
  | 'coral'
  | 'teal'
  | 'gold'
  | 'ink'
  | 'rose'
  | 'sky'
  | 'sage'
  | 'plum'
  | 'mint'
  | 'apricot'
  | 'berry'
  | 'olive'
  | 'ocean';
export type AvatarPreset =
  | 'initial'
  | 'orbit'
  | 'wave'
  | 'ring'
  | 'tile'
  | 'spark'
  | 'bloom'
  | 'kite'
  | 'comet'
  | 'crown'
  | 'cat'
  | 'rabbit'
  | 'leaf'
  | 'flower'
  | 'cherry'
  | 'citrus'
  | 'pig'
  | 'cow'
  | 'panda'
  | 'sprout'
  | 'tulip'
  | 'pear'
  | 'carrot';

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
  avatarPreset: AvatarPreset;
  avatarImage?: string;
  lastContactDate?: string;
  lastViewedAt?: string;
  isImportant: boolean;
  preferences: string[];
  preferenceItems: PreferenceItem[];
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

export const AVATAR_COLORS: AvatarColor[] = [
  'coral',
  'apricot',
  'gold',
  'olive',
  'sage',
  'mint',
  'teal',
  'ocean',
  'ink',
  'sky',
  'plum',
  'berry',
  'rose',
];
export const AVATAR_PRESETS: AvatarPreset[] = [
  'initial',
  'orbit',
  'wave',
  'ring',
  'tile',
  'spark',
  'bloom',
  'kite',
  'comet',
  'crown',
  'cat',
  'rabbit',
  'leaf',
  'flower',
  'cherry',
  'citrus',
  'pig',
  'cow',
  'panda',
  'sprout',
  'tulip',
  'pear',
  'carrot',
];

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
    avatarPreset: 'initial',
    avatarImage: undefined,
    lastContactDate: undefined,
    lastViewedAt: undefined,
    isImportant: false,
    preferences: [],
    preferenceItems: [],
    notes: '',
    basicInfoFields: [],
    customFields: [],
    aiProfile: createEmptyAIPersona(now),
    createdAt: now,
    updatedAt: now,
    contactCount: 0,
  };
}
