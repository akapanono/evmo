import type { CustomField, Friend } from '@/types/friend';

export interface ProfileIntakeQuestion {
  id: keyof ProfileIntakeAnswers;
  eyebrow: string;
  title: string;
  prompt: string;
  placeholder: string;
  hint: string;
}

export interface ProfileIntakeAnswers {
  addressStyle: string;
  communicationStyle: string;
  decisionStyle: string;
  environmentPreference: string;
  giftPreference: string;
  boundaries: string;
  careTopics: string;
}

export const PROFILE_INTAKE_FIELD_LABELS: Record<keyof ProfileIntakeAnswers, string> = {
  addressStyle: '称呼与互动感觉',
  communicationStyle: '表达风格',
  decisionStyle: '决策偏好',
  environmentPreference: '环境偏好',
  giftPreference: '送礼偏好',
  boundaries: '相处边界',
  careTopics: '在意的话题',
};

export const PROFILE_INTAKE_QUESTIONS: ProfileIntakeQuestion[] = [
  {
    id: 'addressStyle',
    eyebrow: '相处方式',
    title: '你们平时相处时，大致是什么状态？',
    prompt: '可以写称呼、距离感，以及你们聊天时通常是随意、克制，还是会保留分寸。',
    placeholder: '例如：我平时叫他老奥，我们之间不太客套，熟了以后说话会比较直接',
    hint: '这会影响回答时的熟悉度和语气。',
  },
  {
    id: 'communicationStyle',
    eyebrow: '表达习惯',
    title: '他平时说话和表达自己，是什么风格？',
    prompt: '描述一下他的语气、回复节奏、情绪表达方式，以及熟了之后的聊天习惯。',
    placeholder: '例如：回复不算长，但很真诚；熟了会开玩笑；情绪不会说得太满',
    hint: '这类信息比单纯的喜好更能决定回答像不像本人。',
  },
  {
    id: 'decisionStyle',
    eyebrow: '做事偏好',
    title: '他做决定时，通常更看重什么？',
    prompt: '想想他买东西、选地方、安排事情时，更偏实用、质感、效率、感觉，还是别的标准。',
    placeholder: '例如：他买东西比较看重质感和实际体验，不太会为了便宜去凑合',
    hint: '这能帮助系统理解他做选择时的判断标准。',
  },
  {
    id: 'environmentPreference',
    eyebrow: '环境偏好',
    title: '他更适合什么样的环境和氛围？',
    prompt: '写写他偏热闹还是安静，偏松弛还是利落，通常会对什么样的场景更有好感。',
    placeholder: '例如：他更喜欢安静一点、有些设计感的地方，不太喜欢太吵太乱的环境',
    hint: '这会影响对场景、活动和体验的判断。',
  },
  {
    id: 'giftPreference',
    eyebrow: '礼物取向',
    title: '送他东西时，什么方向更容易合适？',
    prompt: '写写他收到礼物时更在意心意、审美、实用性、惊喜感，还是某种明确风格。',
    placeholder: '例如：比起价格，他更在意东西有没有质感和用心，太敷衍会很明显',
    hint: '这会比单一的喜好词条更能帮助判断礼物方向。',
  },
  {
    id: 'boundaries',
    eyebrow: '相处边界',
    title: '他在相处里最反感什么？',
    prompt: '可以写沟通方式、雷区、禁忌，或者那些会让他明显不舒服的相处习惯。',
    placeholder: '例如：他不喜欢别人越界打听隐私，也不喜欢太吵、太黏、没有分寸的靠近',
    hint: '边界写得越清楚，回答越不容易偏。',
  },
  {
    id: 'careTopics',
    eyebrow: '关注点',
    title: '他平时最在意、最容易被什么打动？',
    prompt: '可以写他常聊的话题、长期在意的事，或者那些最容易牵动他注意力和情绪的方向。',
    placeholder: '例如：他比较在意生活品质和体验感，也很看重朋友是否认真、真诚',
    hint: '这会成为画像里比较稳定的关注方向。',
  },
];

const INTAKE_SOURCE_PREFIX = '[profile-intake]';

function buildSourceTag(questionId: string): string {
  return `${INTAKE_SOURCE_PREFIX}:${questionId}`;
}

function matchesSourceTag(field: CustomField, questionId: keyof ProfileIntakeAnswers): boolean {
  return field.sourceText === buildSourceTag(questionId);
}

function buildField(
  questionId: keyof ProfileIntakeAnswers,
  value: string,
  existing?: CustomField,
): CustomField {
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? crypto.randomUUID(),
    label: PROFILE_INTAKE_FIELD_LABELS[questionId],
    value: value.trim(),
    createdAt: existing?.createdAt ?? now,
    includeInTimeline: false,
    semanticType: 'note',
    temporalScope: 'stable',
    extractionMethod: 'manual',
    sourceText: buildSourceTag(questionId),
  };
}

function upsertQuestionField(
  existingFields: CustomField[],
  questionId: keyof ProfileIntakeAnswers,
  value: string,
): CustomField[] {
  const retained = existingFields.filter((field) => !matchesSourceTag(field, questionId));
  if (!value.trim()) {
    return retained.slice(0, 30);
  }

  const previous = existingFields.find((field) => matchesSourceTag(field, questionId));
  return [buildField(questionId, value, previous), ...retained].slice(0, 30);
}

export function createEmptyProfileIntakeAnswers(): ProfileIntakeAnswers {
  return {
    addressStyle: '',
    communicationStyle: '',
    decisionStyle: '',
    environmentPreference: '',
    giftPreference: '',
    boundaries: '',
    careTopics: '',
  };
}

export function getProfileIntakeAnswersFromFriend(friend: Friend): ProfileIntakeAnswers {
  const answers = createEmptyProfileIntakeAnswers();

  for (const question of PROFILE_INTAKE_QUESTIONS) {
    const field = friend.customFields.find((item) => matchesSourceTag(item, question.id));
    if (field) {
      answers[question.id] = field.value;
    }
  }

  return answers;
}

export function applyProfileIntakeAnswers(friend: Friend, answers: ProfileIntakeAnswers): Partial<Friend> {
  let nextFields = [...friend.customFields];

  for (const question of PROFILE_INTAKE_QUESTIONS) {
    nextFields = upsertQuestionField(nextFields, question.id, answers[question.id]);
  }

  return {
    customFields: nextFields,
  };
}
