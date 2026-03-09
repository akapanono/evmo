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
    eyebrow: '互动距离',
    title: '你们平时是什么相处感觉？',
    prompt: '写写你平时怎么叫他、你们聊天的距离感和默认相处状态。',
    placeholder: '例如：我平时叫他老奥，我们说话很随意，不太客套，熟了以后开口就很直接',
    hint: '这会影响 AI 分身跟你说话时的熟悉度和语气。',
  },
  {
    id: 'communicationStyle',
    eyebrow: '表达方式',
    title: '他平时表达自己是什么风格？',
    prompt: '描述一下他的语气、回复节奏、情绪表达方式，以及熟了之后的聊天习惯。',
    placeholder: '例如：回复不长，但挺真诚；熟了会开玩笑；情绪不太外露，更多是轻描淡写地说',
    hint: '这里比“他喜欢什么”更影响 AI 看起来像不像本人。',
  },
  {
    id: 'decisionStyle',
    eyebrow: '做事偏好',
    title: '他做决定时更看重什么？',
    prompt: '想想他买东西、选地方、安排事情时，更偏实用、质感、感觉、品牌、效率还是别的标准。',
    placeholder: '例如：买东西更看质感和实际体验，不太会为了便宜去凑合',
    hint: '这会帮助 AI 从已知资料推断他还可能喜欢什么。',
  },
  {
    id: 'environmentPreference',
    eyebrow: '环境偏好',
    title: '他更适合什么样的环境和氛围？',
    prompt: '写写他偏热闹还是安静、偏松弛还是效率、喜欢什么样的场景。',
    placeholder: '例如：更喜欢安静一点、有点设计感的地方，不太喜欢太吵太乱的环境',
    hint: 'AI 会据此推断他可能偏好的体验和场景。',
  },
  {
    id: 'giftPreference',
    eyebrow: '礼物取向',
    title: '送他东西时，什么方向更容易打动他？',
    prompt: '写写他收到礼物时更在意心意、审美、实用、惊喜感，还是某种明确风格。',
    placeholder: '例如：比起价格，他更在意东西有没有质感和用心，太敷衍的一眼就能感觉出来',
    hint: '这比单一的“喜欢香水”更能让 AI 做延展推断。',
  },
  {
    id: 'boundaries',
    eyebrow: '相处边界',
    title: '他在相处里最反感什么？',
    prompt: '可以写沟通方式、雷区、禁忌、让他不舒服的相处习惯。',
    placeholder: '例如：不喜欢别人突然越界打听隐私，也讨厌太吵太黏和没有分寸的人',
    hint: 'AI 会把这些当作边界，而不是随便猜他的态度。',
  },
  {
    id: 'careTopics',
    eyebrow: '关注点',
    title: '他平时最在意、最容易被什么打动？',
    prompt: '可以写他常聊的话题、长期在意的事、容易投入精力或情绪的方向。',
    placeholder: '例如：他很在意生活品质和体验感，也挺在意朋友是否真诚、有心',
    hint: '这会变成 AI 画像层里的核心关注点。',
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
