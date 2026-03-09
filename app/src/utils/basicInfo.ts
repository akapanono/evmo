import type { BasicInfoExtractionField } from '@/types/extraction';
import type { BasicInfoField, Friend } from '@/types/friend';

export const STANDARD_BASIC_INFO_LABELS = {
  nickname: '昵称',
  relationship: '关系',
  birthday: '生日',
  gender: '性别',
  age: '年龄',
  heightCm: '身高',
  weightKg: '体重',
  city: '常住城市',
  hometown: '家乡',
  occupation: '职业',
  company: '公司',
  school: '学校',
  major: '专业',
} as const;

export type StandardBasicInfoKey = Exclude<keyof typeof STANDARD_BASIC_INFO_LABELS, 'birthday' | 'relationship' | 'nickname'> | 'birthday' | 'relationship' | 'nickname';

const LABEL_TO_KEY: Record<string, StandardBasicInfoKey> = {
  昵称: 'nickname',
  关系: 'relationship',
  生日: 'birthday',
  性别: 'gender',
  年龄: 'age',
  身高: 'heightCm',
  体重: 'weightKg',
  常住城市: 'city',
  城市: 'city',
  所在城市: 'city',
  家乡: 'hometown',
  籍贯: 'hometown',
  职业: 'occupation',
  工作: 'occupation',
  公司: 'company',
  学校: 'school',
  专业: 'major',
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function normalizeNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed.replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getStandardBasicInfoEntries(friend: Friend): Array<{ key: StandardBasicInfoKey; label: string; value: string }> {
  const entries: Array<{ key: StandardBasicInfoKey; label: string; value: string }> = [];

  const pushEntry = (key: StandardBasicInfoKey, value: string | number | undefined): void => {
    if (value === undefined || value === null || `${value}`.trim() === '') {
      return;
    }

    entries.push({
      key,
      label: STANDARD_BASIC_INFO_LABELS[key],
      value: String(value),
    });
  };

  pushEntry('nickname', friend.nickname);
  pushEntry('relationship', friend.relationship);
  pushEntry('birthday', friend.birthday);
  pushEntry('gender', friend.gender);
  pushEntry('age', friend.age);
  pushEntry('heightCm', friend.heightCm);
  pushEntry('weightKg', friend.weightKg);
  pushEntry('city', friend.city);
  pushEntry('hometown', friend.hometown);
  pushEntry('occupation', friend.occupation);
  pushEntry('company', friend.company);
  pushEntry('school', friend.school);
  pushEntry('major', friend.major);

  return entries;
}

export function normalizeBasicInfoLabel(label: string): string {
  return label.trim().replace(/[:：]$/, '');
}

export function standardKeyFromLabel(label: string): StandardBasicInfoKey | undefined {
  return LABEL_TO_KEY[normalizeBasicInfoLabel(label)];
}

export function applyBasicInfoExtraction(friend: Friend, fields: BasicInfoExtractionField[]): Partial<Friend> {
  const updates: Partial<Friend> = {};
  const retainedCustomFields = [...friend.basicInfoFields];

  for (const item of fields) {
    const label = normalizeBasicInfoLabel(item.label);
    const value = item.value.trim();
    if (!label || !value) {
      continue;
    }

    const mappedKey = item.normalizedKey && item.normalizedKey in STANDARD_BASIC_INFO_LABELS
      ? item.normalizedKey as StandardBasicInfoKey
      : standardKeyFromLabel(label);

    if (mappedKey) {
      switch (mappedKey) {
        case 'age':
          updates.age = normalizeNumber(value);
          break;
        case 'heightCm':
          updates.heightCm = normalizeNumber(value);
          break;
        case 'weightKg':
          updates.weightKg = normalizeNumber(value);
          break;
        default:
          (updates as Record<string, unknown>)[mappedKey] = value;
          break;
      }
      continue;
    }

    const existing = retainedCustomFields.find((field) => normalizeBasicInfoLabel(field.label) === label);
    if (existing) {
      existing.value = value;
      existing.sourceText = item.sourceText.trim() || value;
      continue;
    }

    retainedCustomFields.unshift({
      id: crypto.randomUUID(),
      label,
      value,
      createdAt: new Date().toISOString(),
      sourceText: item.sourceText.trim() || value,
    });
  }

  updates.basicInfoFields = retainedCustomFields.slice(0, 20);
  return updates;
}

export function upsertBasicInfoField(fields: BasicInfoField[], input: { label: string; value: string }, fieldId?: string): BasicInfoField[] {
  const label = normalizeBasicInfoLabel(input.label);
  const value = input.value.trim();
  if (!label || !value) {
    return fields;
  }

  const now = new Date().toISOString();
  const existingIndex = fieldId
    ? fields.findIndex((field) => field.id === fieldId)
    : fields.findIndex((field) => normalizeBasicInfoLabel(field.label) === label);

  if (existingIndex >= 0) {
    const next = [...fields];
    const current = next[existingIndex]!;
    next[existingIndex] = {
      ...current,
      label,
      value,
      sourceText: value,
    };
    return next;
  }

  return [
    {
      id: crypto.randomUUID(),
      label,
      value,
      createdAt: now,
      sourceText: value,
    },
    ...fields,
  ].slice(0, 20);
}

export function removeBasicInfoField(fields: BasicInfoField[], fieldId: string): BasicInfoField[] {
  return fields.filter((field) => field.id !== fieldId);
}

export function searchBasicInfoCorpus(friend: Friend): string[] {
  return unique([
    ...getStandardBasicInfoEntries(friend).map((item) => `${item.label} ${item.value}`),
    ...friend.basicInfoFields.map((field) => `${field.label} ${field.value}`),
  ]);
}
