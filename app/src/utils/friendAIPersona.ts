import type { Friend, FriendAIPersona } from '@/types/friend';
import { createEmptyAIPersona } from '@/types/friend';

type PersonaBucket = Pick<FriendAIPersona, 'signals' | 'traits' | 'tasteProfile' | 'interactionStyle' | 'inferenceHints' | 'boundaries'>;

const ABSTRACT_FIELD_LABELS = {
  addressStyle: '称呼与互动感觉',
  communicationStyle: '表达风格',
  decisionStyle: '决策偏好',
  environmentPreference: '环境偏好',
  giftPreference: '送礼偏好',
  boundaries: '相处边界',
  careTopics: '在意的话题',
} as const;

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function stableFieldValues(friend: Friend, label: string): string[] {
  return friend.customFields
    .filter((field) => field.temporalScope === 'stable' && field.label === label)
    .map((field) => field.value.trim())
    .filter(Boolean);
}

function rawStableValues(friend: Friend): string[] {
  return friend.customFields
    .filter((field) => field.temporalScope === 'stable')
    .map((field) => `${field.label}：${field.value}`.trim())
    .filter(Boolean);
}

function collectPreferenceSignals(preferences: string[], bucket: PersonaBucket): void {
  const all = preferences.join(' ');

  if (/香水|香氛|香薰|留香/.test(all)) {
    bucket.signals.push('对气味、层次和氛围感比较敏感');
    bucket.tasteProfile.push('偏爱有质感、有气味记忆点的体验');
    bucket.inferenceHints.push('如果要延展选择，可能也会接受留香沐浴露、身体乳、香氛洗护或更讲究味道层次的个护用品。');
  }

  if (/咖啡|书店|安静|展览|博物馆|电影/.test(all)) {
    bucket.signals.push('偏向安静、有审美感的场景');
    bucket.tasteProfile.push('更容易被低刺激、环境舒服的体验打动');
    bucket.inferenceHints.push('可能也会喜欢小众咖啡馆、简洁设计感物件或氛围稳定的空间。');
  }

  if (/运动|健身|跑步|羽毛球|篮球|足球|骑行/.test(all)) {
    bucket.signals.push('日常偏向运动或活力型活动');
    bucket.tasteProfile.push('更看重功能性、状态感和身体体验');
    bucket.inferenceHints.push('可能也会接受运动装备、恢复类用品或更偏实用的礼物。');
  }

  if (/手作|礼物|仪式感|惊喜/.test(all)) {
    bucket.signals.push('对心意和仪式感有感知');
    bucket.tasteProfile.push('收到东西时不只看价格，也看用心程度');
    bucket.inferenceHints.push('相比纯贵重，更可能被有细节、有心意、审美在线的礼物打动。');
  }

  const restrictions = preferences.filter((item) => /不吃|不喜欢|讨厌|忌口|雷区|别/.test(item));
  if (restrictions.length > 0) {
    bucket.boundaries.push(`已知明确雷区或禁忌：${restrictions.slice(0, 3).join('、')}`);
  }
}

function collectBasicSignals(friend: Friend, bucket: PersonaBucket): void {
  if (friend.relationship) {
    bucket.interactionStyle.push(`你们当前的关系是${friend.relationship}`);
  }

  if (friend.city) {
    bucket.signals.push(`当前生活圈和语境更接近${friend.city}`);
  }

  if (friend.hometown && friend.hometown !== friend.city) {
    bucket.signals.push(`成长背景和现在常住地不完全一样，可能同时受${friend.hometown}和${friend.city || '当前城市'}影响`);
  }

  if (friend.occupation) {
    bucket.signals.push(`日常身份更偏向${friend.occupation}`);
  }

  if (friend.company) {
    bucket.signals.push(`目前和${friend.company}相关的工作环境会影响近期状态`);
  }

  if (friend.school || friend.major) {
    bucket.signals.push(`教育背景和专业经历可能会影响他在聊天里的关注点`);
  }
}

function collectAbstractFields(friend: Friend, bucket: PersonaBucket): void {
  for (const value of stableFieldValues(friend, ABSTRACT_FIELD_LABELS.addressStyle)) {
    bucket.interactionStyle.push(value);
  }

  for (const value of stableFieldValues(friend, ABSTRACT_FIELD_LABELS.communicationStyle)) {
    bucket.traits.push(value);
  }

  for (const value of stableFieldValues(friend, ABSTRACT_FIELD_LABELS.decisionStyle)) {
    bucket.tasteProfile.push(value);
    bucket.inferenceHints.push(`做选择时，往往更受这类标准影响：${value}`);
  }

  for (const value of stableFieldValues(friend, ABSTRACT_FIELD_LABELS.environmentPreference)) {
    bucket.tasteProfile.push(value);
  }

  for (const value of stableFieldValues(friend, ABSTRACT_FIELD_LABELS.giftPreference)) {
    bucket.inferenceHints.push(`在礼物和惊喜上，更可能偏向：${value}`);
  }

  for (const value of stableFieldValues(friend, ABSTRACT_FIELD_LABELS.boundaries)) {
    bucket.boundaries.push(value);
  }

  for (const value of stableFieldValues(friend, ABSTRACT_FIELD_LABELS.careTopics)) {
    bucket.signals.push(`他持续在意或常会提到：${value}`);
  }
}

function collectStableSummary(friend: Friend, bucket: PersonaBucket): void {
  const genericStableFields = friend.customFields.filter((field) => {
    if (field.temporalScope !== 'stable') {
      return false;
    }

    return !Object.values(ABSTRACT_FIELD_LABELS).includes(field.label as (typeof ABSTRACT_FIELD_LABELS)[keyof typeof ABSTRACT_FIELD_LABELS]);
  });

  const values = genericStableFields.map((field) => `${field.label}：${field.value}`);
  if (values.length > 0) {
    bucket.signals.push(`还有一些稳定资料会影响对他的理解：${values.slice(0, 3).join('；')}`);
  }
}

function buildOverview(friend: Friend, persona: PersonaBucket): string {
  const overviewParts: string[] = [];

  if (persona.interactionStyle.length > 0) {
    overviewParts.push(`相处上更像这样：${persona.interactionStyle.slice(0, 2).join('；')}`);
  }

  if (persona.traits.length > 0) {
    overviewParts.push(`表达和个性上：${persona.traits.slice(0, 2).join('；')}`);
  }

  if (persona.tasteProfile.length > 0) {
    overviewParts.push(`审美和偏好上：${persona.tasteProfile.slice(0, 2).join('；')}`);
  }

  if (persona.boundaries.length > 0) {
    overviewParts.push(`需要留意的边界：${persona.boundaries.slice(0, 2).join('；')}`);
  }

  if (overviewParts.length === 0) {
    return friend.relationship
      ? `目前只知道你们的关系是${friend.relationship}，还缺少足够多的性格、审美和互动信息。`
      : '目前资料还比较少，只能建立基础档案，暂时还不足以形成稳定的人物画像。';
  }

  return overviewParts.join('\n');
}

export function compileFriendAIPersona(friend: Friend, updatedAt = new Date().toISOString()): FriendAIPersona {
  const bucket: PersonaBucket = {
    signals: [],
    traits: [],
    tasteProfile: [],
    interactionStyle: [],
    inferenceHints: [],
    boundaries: [],
  };

  collectBasicSignals(friend, bucket);
  collectAbstractFields(friend, bucket);
  collectPreferenceSignals(friend.preferences, bucket);
  collectStableSummary(friend, bucket);

  const overview = buildOverview(friend, bucket);

  return {
    ...createEmptyAIPersona(updatedAt),
    overview,
    signals: unique(bucket.signals),
    traits: unique(bucket.traits),
    tasteProfile: unique(bucket.tasteProfile),
    interactionStyle: unique(bucket.interactionStyle),
    inferenceHints: unique(bucket.inferenceHints),
    boundaries: unique(bucket.boundaries),
  };
}

export function buildAIPersonaContext(friend: Friend): string {
  const persona = friend.aiProfile;
  const lines: string[] = [];

  if (persona.overview) {
    lines.push(`画像摘要: ${persona.overview}`);
  }

  if (persona.traits.length > 0) {
    lines.push(`性格与表达: ${persona.traits.slice(0, 4).join('；')}`);
  }

  if (persona.tasteProfile.length > 0) {
    lines.push(`审美与偏好倾向: ${persona.tasteProfile.slice(0, 4).join('；')}`);
  }

  if (persona.interactionStyle.length > 0) {
    lines.push(`互动方式: ${persona.interactionStyle.slice(0, 4).join('；')}`);
  }

  if (persona.inferenceHints.length > 0) {
    lines.push(`可做的轻度推断: ${persona.inferenceHints.slice(0, 4).join('；')}`);
  }

  if (persona.boundaries.length > 0) {
    lines.push(`边界与雷区: ${persona.boundaries.slice(0, 4).join('；')}`);
  }

  if (lines.length === 0) {
    const stableNotes = rawStableValues(friend);
    return stableNotes.length > 0 ? `稳定资料: ${stableNotes.slice(0, 4).join('；')}` : '';
  }

  return lines.join('\n');
}
