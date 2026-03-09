import OpenAI from 'openai';
import type { Friend } from '@/types/friend';
import type { LlmExtractionPayload, SemanticExtractionRecord, SemanticExtractionResult } from '@/types/extraction';
import type { AppSettings } from '@/types/settings';
import { storageService } from './storageService';
import { formatBirthday } from '@/utils/dateHelpers';
import { parseSupplementInput } from '@/utils/semantic';
import { buildAIPersonaContext } from '@/utils/friendAIPersona';

interface ProxyResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface RuntimeProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AskAIResult {
  content: string;
  suggestions: string[];
  lowInfoMode: boolean;
}

interface ProfileGuidance {
  lowInfoMode: boolean;
  suggestions: string[];
  contextSummary: string;
}

const LEGACY_DEFAULT_QUESTIONS = [
  '她最近适合聊什么？',
  '送她什么更合适？',
  '我现在联系她合适吗？',
];

const SECOND_PERSON_DEFAULT_QUESTIONS = [
  '你最近在忙什么？',
  '你现在最想聊什么？',
  '我现在联系你合适吗？',
];

function buildBasicInfoContext(friend: Friend): string {
  const parts: string[] = [];

  parts.push(`姓名: ${friend.name}`);
  if (friend.nickname) parts.push(`昵称: ${friend.nickname}`);
  if (friend.relationship) parts.push(`关系: ${friend.relationship}`);
  if (friend.birthday) parts.push(`生日: ${formatBirthday(friend.birthday)}`);
  if (friend.gender) parts.push(`性别: ${friend.gender}`);
  if (friend.age !== undefined) parts.push(`年龄: ${friend.age}`);
  if (friend.heightCm !== undefined) parts.push(`身高: ${friend.heightCm}cm`);
  if (friend.weightKg !== undefined) parts.push(`体重: ${friend.weightKg}kg`);
  if (friend.city) parts.push(`常住城市: ${friend.city}`);
  if (friend.hometown) parts.push(`家乡: ${friend.hometown}`);
  if (friend.occupation) parts.push(`职业: ${friend.occupation}`);
  if (friend.company) parts.push(`公司: ${friend.company}`);
  if (friend.school) parts.push(`学校: ${friend.school}`);
  if (friend.major) parts.push(`专业: ${friend.major}`);
  if (friend.preferences.length > 0) parts.push(`明确偏好/特点: ${friend.preferences.join('、')}`);

  return parts.join('\n');
}

function buildFriendContext(friend: Friend): string {
  const parts: string[] = [];
  const basicInfo = buildBasicInfoContext(friend);
  const personaContext = buildAIPersonaContext(friend);

  if (basicInfo) {
    parts.push(basicInfo);
  }

  if (personaContext) {
    parts.push(personaContext);
  }

  const stableFields = friend.customFields.filter((field) => field.temporalScope === 'stable').slice(0, 4);
  if (stableFields.length > 0) {
    parts.push(`稳定资料: ${stableFields.map((field) => `${field.label}-${field.value}`).join('；')}`);
  }

  const timeboundFields = friend.customFields.filter((field) => field.temporalScope === 'timebound').slice(0, 4);
  if (timeboundFields.length > 0) {
    parts.push(`近期事件: ${timeboundFields.map((field) => field.value).join('；')}`);
  }

  return parts.join('\n');
}

function buildExtractionContext(friend: Friend): string {
  const parts: string[] = [];
  const basicInfo = buildBasicInfoContext(friend);
  const personaContext = buildAIPersonaContext(friend);

  if (basicInfo) {
    parts.push(basicInfo);
  }

  if (personaContext) {
    parts.push(personaContext);
  }

  const stableFields = friend.customFields
    .filter((field) => field.temporalScope === 'stable')
    .slice(0, 2)
    .map((field) => field.value);
  if (stableFields.length > 0) {
    parts.push(`稳定信息: ${stableFields.join('；')}`);
  }

  const timeboundFields = friend.customFields
    .filter((field) => field.temporalScope === 'timebound')
    .slice(0, 2)
    .map((field) => field.eventTimeText ? `${field.eventTimeText} ${field.value}` : field.value);
  if (timeboundFields.length > 0) {
    parts.push(`近期事件: ${timeboundFields.join('；')}`);
  }

  return parts.join('\n');
}

function getSystemPrompt(style: 'friendly' | 'professional' | 'concise'): string {
  const basePrompt = '你要扮演档案中的这位朋友本人，相当于这个人的数字分身。始终用第一人称“我”说话，把提问者称为“你”。回答时不要跳出角色，不要说自己是 AI，不要说“根据档案显示”或“从资料看”。你的目标不是背诵档案，而是像本人正常聊天一样自然回应。你会同时看到事实资料和一层抽象画像。抽象画像是根据资料整理出的倾向和互动特征，可以帮助你做轻度、保守的联想，但这些联想不能被说成已经确认的事实。只有当问题本身明显相关时，才自然带出偏好、边界、关系回忆或近况。不要编造具体时间、地点、经历和已经发生过的细节。';

  switch (style) {
    case 'friendly':
      return `${basePrompt} 整体语气亲切、松弛，像熟悉的朋友在聊天。`;
    case 'professional':
      return `${basePrompt} 整体表达清楚、有条理，但仍然保持朋友本人视角。`;
    case 'concise':
      return `${basePrompt} 回答尽量简洁，像朋友直接回复消息。`;
    default:
      return basePrompt;
  }
}

function normalizeBaseUrl(baseUrl: string | undefined): string | undefined {
  const trimmed = baseUrl?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : undefined;
}

function getProxyBaseUrl(settings: AppSettings): string {
  return normalizeBaseUrl(settings.proxyServerUrl) || 'http://localhost:8787';
}

function getActiveModel(settings: AppSettings): string {
  return settings.openaiModel?.trim() || 'ep-20260309112425-mwdsp';
}

function getRuntimeProviderConfig(settings: AppSettings): RuntimeProviderConfig {
  return {
    apiKey: settings.openaiApiKey,
    baseUrl: normalizeBaseUrl(settings.openaiBaseUrl),
    model: getActiveModel(settings),
  };
}

function createClient(settings: AppSettings): OpenAI {
  if (!settings.openaiApiKey) {
    throw new Error('请先在设置中填写 API Key。');
  }

  return new OpenAI({
    apiKey: settings.openaiApiKey,
    baseURL: normalizeBaseUrl(settings.openaiBaseUrl),
    dangerouslyAllowBrowser: true,
  });
}

async function postToProxy<T>(path: string, body: Record<string, unknown>, settings: AppSettings): Promise<T> {
  const response = await fetch(`${getProxyBaseUrl(settings)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId: settings.proxyProviderId?.trim() || undefined,
      runtimeProvider: getRuntimeProviderConfig(settings),
      ...body,
    }),
  });

  const payload = await response.json() as ProxyResponse<T>;
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error || '代理请求失败。');
  }

  return payload.data;
}

function buildExtractionPrompt(friend: Friend, text: string): string {
  const context = buildExtractionContext(friend);

  return [
    '把这句中文补充描述抽取成朋友档案 JSON。只返回 JSON，不要解释，不要代码块。',
    `上下文: ${context || '无'}`,
    `输入: ${text}`,
    '返回格式:',
    '{"birthday":"MM-DD 或空","preferences":["字符串"],"records":[{"label":"事件或重要信息","value":"原句或精炼短句","includeInTimeline":true,"semanticType":"event|note|milestone|preference|restriction|status","temporalScope":"timebound|stable","eventTimeText":"时间词或空","sourceText":"原句","normalizedValue":"归一化值或空","confidence":0.9}],"noteLine":"原句","rawText":"原句"}',
    '规则: 只有有时限、阶段性、近期事项才进时间线并设为 timebound；生日、忌口、长期偏好、稳定特征一律 stable 且不进时间线；像“最近准备考研”“下周出差”“明天考试”进时间线；像“生日是12月27日”“不吃香菜”“不喜欢猫”不进时间线。',
  ].join('\n');
}

function stripJsonWrapper(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return trimmed;
}

function normalizeRecord(record: Partial<SemanticExtractionRecord>, rawText: string): SemanticExtractionRecord {
  const includeInTimeline = Boolean(record.includeInTimeline);
  const temporalScope = record.temporalScope === 'timebound' || includeInTimeline ? 'timebound' : 'stable';

  return {
    label: typeof record.label === 'string' && record.label.trim() ? record.label.trim() : includeInTimeline ? '事件' : '重要信息',
    value: typeof record.value === 'string' && record.value.trim() ? record.value.trim() : rawText,
    includeInTimeline,
    semanticType: record.semanticType ?? (includeInTimeline ? 'event' : 'note'),
    temporalScope,
    extractionMethod: 'llm',
    sourceText: typeof record.sourceText === 'string' && record.sourceText.trim() ? record.sourceText.trim() : rawText,
    eventTimeText: typeof record.eventTimeText === 'string' && record.eventTimeText.trim() ? record.eventTimeText.trim() : undefined,
    normalizedValue: typeof record.normalizedValue === 'string' && record.normalizedValue.trim() ? record.normalizedValue.trim() : undefined,
    confidence: typeof record.confidence === 'number' ? Math.max(0, Math.min(1, record.confidence)) : undefined,
  };
}

function normalizeExtractionPayload(payload: Partial<LlmExtractionPayload>, rawText: string): SemanticExtractionResult {
  return {
    birthday: typeof payload.birthday === 'string' && payload.birthday.trim() ? payload.birthday.trim() : undefined,
    preferences: Array.isArray(payload.preferences) ? payload.preferences.map((item: string) => String(item).trim()).filter(Boolean) : [],
    records: Array.isArray(payload.records)
      ? payload.records.map((record: Partial<SemanticExtractionRecord>) => normalizeRecord(record, rawText))
      : [],
    noteLine: typeof payload.noteLine === 'string' && payload.noteLine.trim() ? payload.noteLine.trim() : rawText,
    rawText: typeof payload.rawText === 'string' && payload.rawText.trim() ? payload.rawText.trim() : rawText,
  };
}

function buildProfileGuidance(friend: Friend): ProfileGuidance {
  const suggestions: string[] = [];
  const stableFields = friend.customFields.filter((field) => field.temporalScope === 'stable');
  const timelineFields = friend.customFields.filter((field) => field.temporalScope === 'timebound');
  const persona = friend.aiProfile;

  let infoScore = 0;
  if (friend.relationship) infoScore += 1;
  if (friend.nickname) infoScore += 1;
  if (friend.birthday) infoScore += 1;
  if (friend.preferences.length > 0) infoScore += 2;
  if (stableFields.length > 0) infoScore += 2;
  if (timelineFields.length > 0) infoScore += 2;
  if (persona.traits.length > 0 || persona.tasteProfile.length > 0 || persona.interactionStyle.length > 0) infoScore += 3;

  if (persona.traits.length === 0 && persona.interactionStyle.length === 0) {
    suggestions.push('补充他平时怎么表达自己、你们是什么相处感觉');
  }
  if (persona.tasteProfile.length === 0) {
    suggestions.push('补充他做选择更看重什么，以及适合什么样的环境和氛围');
  }
  if (persona.boundaries.length === 0) {
    suggestions.push('补充他在相处里最反感什么，有没有明显边界或雷区');
  }
  if (timelineFields.length === 0) {
    suggestions.push('补充他最近在忙什么，或者接下来有什么安排');
  }

  const contextParts = [
    friend.relationship ? `已知你和对方的关系是${friend.relationship}` : undefined,
    persona.overview ? `已形成一层人物画像` : undefined,
    persona.inferenceHints.length > 0 ? `已知可做的轻度推断 ${persona.inferenceHints.slice(0, 2).join('；')}` : undefined,
  ].filter(Boolean) as string[];

  return {
    lowInfoMode: infoScore < 6,
    suggestions: suggestions.slice(0, 3),
    contextSummary: contextParts.length > 0 ? contextParts.join('；') : '当前档案和画像信息都还比较少',
  };
}

function buildAskUserPrompt(friend: Friend, question: string, guidance: ProfileGuidance): string {
  const context = buildFriendContext(friend);

  if (guidance.lowInfoMode) {
    return `你就是 ${friend.name} 本人。下面是关于你的资料和画像：\n\n${context || '暂无更多内容'}\n\n当前已知线索：${guidance.contextSummary}\n\n对方现在问你：${question}\n\n请你直接以本人视角自然回复，对对方使用“你”。优先像正常聊天那样先回答问题本身，不要为了显得像本人就硬塞档案内容。可以参考抽象画像做低风险、轻度推断，但不能把推断说成已经确认的事实，也不要编造具体经历、具体时间或具体地点。如果拿不准，就像本人聊天一样说得保守一点。`;
  }

  return `你就是 ${friend.name} 本人。下面是关于你的资料和画像：\n\n${context}\n\n对方现在问你：${question}\n\n请你直接以本人视角自然回答，对对方使用“你”。优先回答问题本身，再在明显相关时自然利用这些资料和画像。你可以根据抽象画像做小幅度联想，例如从审美、环境、决策偏好去推断“更可能喜欢什么”，但不要把推断说成铁定事实，也不要编造具体经历。`;
}

export const aiService = {
  getConnectionSummary(): { configured: boolean; mode: 'direct' | 'proxy'; baseUrl?: string; model: string; providerId?: string } {
    const settings = storageService.getSettings();
    return {
      configured: settings.aiAccessMode === 'proxy'
        ? Boolean(settings.proxyServerUrl && settings.openaiBaseUrl && settings.openaiApiKey && getActiveModel(settings))
        : Boolean(settings.openaiApiKey),
      mode: settings.aiAccessMode,
      baseUrl: settings.aiAccessMode === 'proxy' ? getProxyBaseUrl(settings) : normalizeBaseUrl(settings.openaiBaseUrl),
      model: getActiveModel(settings),
      providerId: settings.proxyProviderId,
    };
  },

  async testAPIKey(apiKey: string, model: string, baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: normalizeBaseUrl(baseUrl),
        dangerouslyAllowBrowser: true,
      });

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
      });

      return completion.choices[0]?.message?.content
        ? { success: true, message: '连接成功，模型可用。' }
        : { success: false, message: 'API 返回异常。' };
    } catch (err: any) {
      if (err.status === 401) return { success: false, message: 'API Key 无效，请检查后重试。' };
      if (err.status === 404) return { success: false, message: '模型名或 Base URL 不正确。' };
      if (err.status === 429) return { success: false, message: '请求频率超限，请稍后再试。' };
      return { success: false, message: err.message || 'API Key 无效或网络异常。' };
    }
  },

  async testProxyConnection(): Promise<{ success: boolean; message: string }> {
    const settings = storageService.getSettings();
    try {
      const result = await postToProxy<{ message: string }>('/api/ai/test', { model: getActiveModel(settings) }, settings);
      return { success: true, message: result.message };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : '代理测试失败。' };
    }
  },

  async askAI(friend: Friend, question: string): Promise<AskAIResult> {
    const settings = storageService.getSettings();
    const guidance = buildProfileGuidance(friend);
    const systemPrompt = getSystemPrompt(settings.aiStyle);
    const userPrompt = buildAskUserPrompt(friend, question, guidance);

    if (settings.aiAccessMode === 'proxy') {
      const result = await postToProxy<{ content: string }>('/api/ai/chat', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: getActiveModel(settings),
        temperature: guidance.lowInfoMode ? 0.85 : 0.72,
        max_tokens: 700,
      }, settings);
      return {
        content: result.content,
        suggestions: guidance.suggestions,
        lowInfoMode: guidance.lowInfoMode,
      };
    }

    const client = createClient(settings);
    const completion = await client.chat.completions.create({
      model: getActiveModel(settings),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: guidance.lowInfoMode ? 0.85 : 0.72,
      max_tokens: 700,
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) throw new Error('AI 没有返回答案。');

    return {
      content: answer,
      suggestions: guidance.suggestions,
      lowInfoMode: guidance.lowInfoMode,
    };
  },

  async extractSupplement(friend: Friend, text: string): Promise<SemanticExtractionResult> {
    const normalizedText = text.trim();
    if (!normalizedText) throw new Error('请输入要解析的内容。');

    const settings = storageService.getSettings();
    const quickParsed = parseSupplementInput(normalizedText);
    if (quickParsed.birthday || quickParsed.preferences.length > 0) {
      return quickParsed;
    }

    if (settings.aiAccessMode === 'proxy') {
      const result = await postToProxy<{ content: string }>('/api/ai/chat', {
        messages: [
          { role: 'system', content: '你是一个信息抽取器。输出必须是合法 JSON。' },
          { role: 'user', content: buildExtractionPrompt(friend, normalizedText) },
        ],
        model: getActiveModel(settings),
        temperature: 0.2,
        max_tokens: 420,
      }, settings);
      const payload = JSON.parse(stripJsonWrapper(result.content)) as Partial<LlmExtractionPayload>;
      return normalizeExtractionPayload(payload, normalizedText);
    }

    if (!settings.openaiApiKey) {
      return parseSupplementInput(normalizedText);
    }

    const client = createClient(settings);
    const completion = await client.chat.completions.create({
      model: getActiveModel(settings),
      messages: [
        { role: 'system', content: '你是一个信息抽取器。输出必须是合法 JSON。' },
        { role: 'user', content: buildExtractionPrompt(friend, normalizedText) },
      ],
      temperature: 0.2,
      max_tokens: 420,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('AI 没有返回抽取结果。');

    const payload = JSON.parse(stripJsonWrapper(content)) as Partial<LlmExtractionPayload>;
    return normalizeExtractionPayload(payload, normalizedText);
  },

  getDefaultQuestions(): string[] {
    const settings = storageService.getSettings();
    if (JSON.stringify(settings.defaultQuestions) === JSON.stringify(LEGACY_DEFAULT_QUESTIONS)) {
      return SECOND_PERSON_DEFAULT_QUESTIONS;
    }
    return settings.defaultQuestions?.length ? settings.defaultQuestions : SECOND_PERSON_DEFAULT_QUESTIONS;
  },
};
