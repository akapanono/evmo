import OpenAI from 'openai';
import type { Friend } from '@/types/friend';
import { storageService } from './storageService';
import { formatBirthday, getRelativeTime } from '@/utils/date';

function buildFriendContext(friend: Friend): string {
  const parts = [];

  parts.push(`姓名: ${friend.name}`);
  if (friend.nickname) parts.push(`昵称: ${friend.nickname}`);
  parts.push(`关系: ${friend.relationship}`);
  if (friend.birthday) parts.push(`生日: ${formatBirthday(friend.birthday)}`);
  if (friend.lastContactDate) {
    parts.push(`最近联系: ${getRelativeTime(friend.lastContactDate)}`);
  }
  if (friend.preferences.length > 0) {
    parts.push(`偏好/特点: ${friend.preferences.join(', ')}`);
  }
  if (friend.notes) {
    parts.push(`备注: ${friend.notes}`);
  }

  return parts.join('\n');
}

function getSystemPrompt(style: 'friendly' | 'professional' | 'concise'): string {
  const basePrompt =
    '你是一个帮助用户维护朋友关系的助手。基于用户提供的朋友档案信息，回答用户的问题。' +
    '回答应该有帮助、体贴，并且考虑到朋友的偏好和情况。';

  switch (style) {
    case 'friendly':
      return basePrompt + ' 语气亲切友好，像一个贴心的朋友给出建议。';
    case 'professional':
      return basePrompt + ' 语气专业、周到，给出有条理的建议。';
    case 'concise':
      return basePrompt + ' 回答简洁明了，直击要点。';
    default:
      return basePrompt;
  }
}

export const aiService = {
  /**
   * 向 AI 提问
   */
  async askAI(friend: Friend, question: string): Promise<string> {
    const settings = storageService.getSettings();

    if (!settings.openaiApiKey) {
      throw new Error('请先在设置中配置 OpenAI API Key');
    }

    const client = new OpenAI({
      apiKey: settings.openaiApiKey,
      dangerouslyAllowBrowser: true,
    });

    const context = buildFriendContext(friend);

    const completion = await client.chat.completions.create({
      model: settings.openaiModel || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(settings.aiStyle),
        },
        {
          role: 'user',
          content: `以下是关于 ${friend.name} 的档案信息：\n\n${context}\n\n我的问题是：${question}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) {
      throw new Error('AI 没有返回答案');
    }

    return answer;
  },

  /**
   * 生成快捷问题
   */
  getDefaultQuestions(): string[] {
    const settings = storageService.getSettings();
    return settings.defaultQuestions;
  },
};
