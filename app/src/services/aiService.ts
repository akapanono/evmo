import OpenAI from 'openai';
import type { Friend } from '@/types/friend';
import type { LlmExtractionPayload, SemanticExtractionRecord, SemanticExtractionResult } from '@/types/extraction';
import type { AppSettings } from '@/types/settings';
import { storageService } from './storageService';
import { formatBirthday } from '@/utils/dateHelpers';
import { parseSupplementInput } from '@/utils/semantic';

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
function buildFriendContext(friend: Friend): string {
  const parts: string[] = [];

  parts.push(`姓名: ${friend.name}`);
  if (friend.nickname) parts.push(`昵称: ${friend.nickname}`);
  if (friend.relationship) parts.push(`关系: ${friend.relationship}`);
  if (friend.birthday) parts.push(`生日: ${formatBirthday(friend.birthday)}`);
  if (friend.preferences.length > 0) parts.push(`偏好/特点: ${friend.preferences.join(', ')}`);

  const stableFields = friend.customFields.filter((field) => field.temporalScope === 'stable').slice(0, 4);
  if (stableFields.length > 0) {
    parts.push(`稳定信息: ${stableFields.map((field) => `${field.label}-${field.value}`).join('；')}`);
  }

  const timeboundFields = friend.customFields.filter((field) => field.temporalScope === 'timebound').slice(0, 4);
  if (timeboundFields.length > 0) {
    parts.push(`近期事件: ${timeboundFields.map((field) => field.value).join('；')}`);
  }

  return parts.join('\n');
}

function getSystemPrompt(style: 'friendly' | 'professional' | 'concise'): string {
  const basePrompt = '你要扮演档案中的这位朋友本人，用第一人称“我”说话，把提问者称为“你”。回答时不要跳出角色，不要说自己是 AI，也不要说“根据档案显示”。如果信息充足，就像这位朋友本人一样自然回应；如果信息不足，可以基于已有线索做温和推测，但必须克制，不能编造过于具体的事实。如果实在不知道，就直接以朋友口吻承认自己也不太确定，并顺手给出一两个你希望对方了解你的方向。';

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
  return settings.openaiModel?.trim() || 'gpt-4o-mini';
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
  const context = buildFriendContext(friend);

  return [
    '你要把一句中文补充描述，抽取为朋友档案结构化 JSON。',
    '只返回 JSON，不要返回解释，不要使用 Markdown 代码块。',
    '档案上下文：',
    context || '无',
    `用户输入：${text}`,
    '输出 JSON schema：',
    JSON.stringify({
      birthday: 'string | undefined，格式 MM-DD',
      preferences: ['string'],
      records: [
        {
          label: 'string',
          value: 'string',
          includeInTimeline: true,
          semanticType: 'preference | restriction | status | event | milestone | note',
          temporalScope: 'stable | timebound',
          extractionMethod: 'llm',
          sourceText: text,
          eventTimeText: 'string | undefined',
          normalizedValue: 'string | undefined',
          confidence: 0.95,
        },
      ],
      noteLine: text,
      rawText: text,
      model: 'string | optional',
    }),
    '规则：',
    '1. 只有有时限、阶段性、近期发生的事情，includeInTimeline 才为 true，temporalScope 才为 timebound。',
    '2. 生日、忌口、长期偏好、稳定特征都必须是 stable，且不能进入时间线。',
    '3. 例如“最近准备考研”“下周出差”“明天考试”属于时间线。',
    '4. 例如“生日是12月27日”“不吃香菜”“喜欢乌龙茶”不属于时间线。',
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

  let infoScore = 0;
  if (friend.relationship) infoScore += 1;
  if (friend.nickname) infoScore += 1;
  if (friend.birthday) infoScore += 1;
  if (friend.preferences.length > 0) infoScore += 2;
  if (stableFields.length > 0) infoScore += 2;
  if (timelineFields.length > 0) infoScore += 2;

  if (friend.preferences.length === 0) {
    suggestions.push('补充他喜欢什么、不喜欢什么、有没有忌口');
  }
  if (timelineFields.length === 0) {
    suggestions.push('补充他最近在忙什么，或者接下来有什么安排');
  }
  if (stableFields.length === 0) {
    suggestions.push('补充一两条长期稳定的重要信息，比如在意的话题或重要经历');
  }
  if (!friend.nickname && !friend.birthday) {
    suggestions.push('补充更生活化的信息，比如昵称、生日或常见聊天线索');
  }

  const contextParts = [
    friend.relationship ? `已知你和对方的关系是${friend.relationship}` : undefined,
    friend.preferences.length > 0 ? `已知偏好 ${friend.preferences.slice(0, 3).join('、')}` : undefined,
    timelineFields.length > 0 ? `已知近期事件 ${timelineFields.slice(0, 2).map((field) => field.value).join('；')}` : undefined,
  ].filter(Boolean) as string[];

  return {
    lowInfoMode: infoScore < 4,
    suggestions: suggestions.slice(0, 3),
    contextSummary: contextParts.length > 0 ? contextParts.join('；') : '当前档案线索很少',
  };
}

function buildAskUserPrompt(friend: Friend, question: string, guidance: ProfileGuidance): string {
  const context = buildFriendContext(friend);

  if (guidance.lowInfoMode) {
    return `你就是 ${friend.name} 本人。下面是关于你的档案信息：\n\n${context || '暂无更多内容'}\n\n当前已知线索：${guidance.contextSummary}\n\n对方现在问你：${question}\n\n请你直接以朋友本人的口吻回答，对对方使用“你”。这次档案信息较少，所以你可以基于已有线索做低风险、不过度的推测，但不要编造具体经历、具体时间、具体地点或已经发生过的细节。回答要尽量自然，不要生硬地说信息不足。如果还是拿不准，就像朋友聊天一样说自己也不太确定，但可以表达你的大致倾向。`;
  }

  return `你就是 ${friend.name} 本人。下面是关于你的档案信息：\n\n${context}\n\n对方现在问你：${question}\n\n请你直接以朋友本人的口吻回答，对对方使用“你”。优先使用档案里已经明确的信息，不要编造具体经历。`;
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
        temperature: guidance.lowInfoMode ? 0.85 : 0.7,
        max_tokens: 1000,
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
      temperature: guidance.lowInfoMode ? 0.85 : 0.7,
      max_tokens: 1000,
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
    if (settings.aiAccessMode === 'proxy') {
      const result = await postToProxy<{ content: string }>('/api/ai/chat', {
        messages: [
          { role: 'system', content: '你是一个信息抽取器。输出必须是合法 JSON。' },
          { role: 'user', content: buildExtractionPrompt(friend, normalizedText) },
        ],
        model: getActiveModel(settings),
        temperature: 0.2,
        max_tokens: 1200,
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
      max_tokens: 1200,
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

