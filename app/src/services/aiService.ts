import OpenAI from 'openai';
import type { Friend } from '@/types/friend';
import type { LlmExtractionPayload, SemanticExtractionRecord, SemanticExtractionResult } from '@/types/extraction';
import { storageService } from './storageService';
import { formatBirthday } from '@/utils/dateHelpers';
import { parseSupplementInput } from '@/utils/semantic';

function buildFriendContext(friend: Friend): string {
  const parts: string[] = [];

  parts.push(`姓名: ${friend.name}`);
  if (friend.nickname) parts.push(`昵称: ${friend.nickname}`);
  parts.push(`关系: ${friend.relationship}`);
  if (friend.birthday) parts.push(`生日: ${formatBirthday(friend.birthday)}`);
  if (friend.preferences.length > 0) {
    parts.push(`偏好/特点: ${friend.preferences.join(', ')}`);
  }
  if (friend.notes) {
    parts.push(`备注: ${friend.notes}`);
  }

  return parts.join('\n');
}

function getSystemPrompt(style: 'friendly' | 'professional' | 'concise'): string {
  const basePrompt = '你是一个帮助用户维护朋友关系的助手。请基于朋友档案信息，给出自然、具体、可执行的回答。';

  switch (style) {
    case 'friendly':
      return `${basePrompt} 语气亲切，像贴心朋友。`;
    case 'professional':
      return `${basePrompt} 语气专业、清晰、有条理。`;
    case 'concise':
      return `${basePrompt} 回答尽量简洁，直接给出重点。`;
    default:
      return basePrompt;
  }
}

function buildExtractionPrompt(friend: Friend, text: string): string {
  const context = buildFriendContext(friend);

  return [
    `你要把一句中文补充描述，抽取为朋友档案结构化 JSON。`,
    `只返回 JSON，不要返回解释，不要使用 Markdown 代码块。`,
    `档案上下文：`,
    context || '无',
    `用户输入：${text}`,
    `输出 JSON schema：`,
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
    `规则：`,
    `1. 只有有时限、阶段性、近期发生的事情，includeInTimeline 才为 true，temporalScope 才为 timebound。`,
    `2. 生日、忌口、长期偏好、稳定特征都必须是 stable，且不能进入时间线。`,
    `3. 例如“最近准备考研”“下周出差”“明天考试”属于时间线。`,
    `4. 例如“生日是12月27日”“不吃香菜”“喜欢乌龙茶”不属于时间线。`,
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
    label: typeof record.label === 'string' && record.label.trim() ? record.label.trim() : (includeInTimeline ? '事件' : '补充记录'),
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
    preferences: Array.isArray(payload.preferences)
      ? payload.preferences.map((item: string) => String(item).trim()).filter(Boolean)
      : [],
    records: Array.isArray(payload.records)
      ? payload.records.map((record: Partial<SemanticExtractionRecord>) => normalizeRecord(record, rawText))
      : [],
    noteLine: typeof payload.noteLine === 'string' && payload.noteLine.trim() ? payload.noteLine.trim() : rawText,
    rawText: typeof payload.rawText === 'string' && payload.rawText.trim() ? payload.rawText.trim() : rawText,
  };
}

export const aiService = {
  async testAPIKey(apiKey: string, model: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
      });

      if (completion.choices[0]?.message?.content) {
        return { success: true, message: 'API Key 可用，连接成功。' };
      }

      return { success: false, message: 'API 返回异常。' };
    } catch (err: any) {
      let message = 'API Key 无效或网络异常。';

      if (err.status === 401) {
        message = 'API Key 无效，请检查后重试。';
      } else if (err.status === 429) {
        message = '请求频率超限，请稍后再试。';
      } else if (err.message) {
        message = err.message;
      }

      return { success: false, message };
    }
  },

  async askAI(friend: Friend, question: string): Promise<string> {
    const settings = storageService.getSettings();

    if (!settings.openaiApiKey) {
      throw new Error('请先在设置中填写 OpenAI API Key。');
    }

    const client = new OpenAI({
      apiKey: settings.openaiApiKey,
      dangerouslyAllowBrowser: true,
    });

    const context = buildFriendContext(friend);
    const systemPrompt = getSystemPrompt(settings.aiStyle);
    const userPrompt = `以下是 ${friend.name} 的朋友档案：\n\n${context}\n\n我的问题是：${question}\n\n请只基于档案内容回答；如果信息不足，请明确指出还缺什么。`;

    const completion = await client.chat.completions.create({
      model: settings.openaiModel || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) {
      throw new Error('AI 没有返回答案。');
    }

    return answer;
  },

  async extractSupplement(friend: Friend, text: string): Promise<SemanticExtractionResult> {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error('请输入要解析的内容。');
    }

    const settings = storageService.getSettings();
    if (!settings.openaiApiKey) {
      return parseSupplementInput(normalizedText);
    }

    const client = new OpenAI({
      apiKey: settings.openaiApiKey,
      dangerouslyAllowBrowser: true,
    });

    try {
      const completion = await client.chat.completions.create({
        model: settings.openaiModel || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个信息抽取器。输出必须是合法 JSON。',
          },
          {
            role: 'user',
            content: buildExtractionPrompt(friend, normalizedText),
          },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI 没有返回抽取结果。');
      }

      const payload = JSON.parse(stripJsonWrapper(content)) as Partial<LlmExtractionPayload>;
      return normalizeExtractionPayload(payload, normalizedText);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 解析失败';
      throw new Error(`AI 解析失败：${message}`);
    }
  },

  getDefaultQuestions(): string[] {
    const settings = storageService.getSettings();
    return settings.defaultQuestions;
  },
};


