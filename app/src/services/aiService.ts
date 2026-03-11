import OpenAI from 'openai';
import { createEmptyAIPersona, type Friend, type FriendAIPersona } from '@/types/friend';
import type { LlmExtractionPayload, SemanticExtractionRecord, SemanticExtractionResult } from '@/types/extraction';
import type { AppSettings } from '@/types/settings';
import type { ChatMessage } from '@/stores/ai';
import { storageService } from './storageService';
import { runtimeContextService, type RuntimePromptContext } from './runtimeContextService';
import { memorialDayService } from './memorialDayService';
import { formatBirthday, formatMonthDay as formatMonthDayLabel, getDaysUntilBirthday, getDaysUntilMonthDay, isBirthdayToday } from '@/utils/dateHelpers';
import { mergeSemanticExtractionResults, parseSupplementInputBatch } from '@/utils/semantic';
import { buildAIPersonaContext, compileFriendAIPersona } from '@/utils/friendAIPersona';
import { getStandardBasicInfoEntries } from '@/utils/basicInfo';
import type { MemorialDay } from '@/types/memorial';

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

interface AskAIRequestContext {
  guidance: ProfileGuidance;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
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
  for (const entry of getStandardBasicInfoEntries(friend)) {
    if (entry.key === 'birthday') {
      parts.push(`${entry.label}: ${formatBirthday(entry.value)}`);
      continue;
    }

    const suffix = entry.key === 'heightCm' ? 'cm' : entry.key === 'weightKg' ? 'kg' : '';
    parts.push(`${entry.label}: ${entry.value}${suffix}`);
  }

  if (friend.basicInfoFields.length > 0) {
    parts.push(`自定义基础信息: ${friend.basicInfoFields.map((field) => `${field.label}-${field.value}`).join('；')}`);
  }

  if (friend.preferences.length > 0) parts.push(`明确偏好/特点: ${friend.preferences.join('、')}`);

  return parts.join('\n');
}

function isGiftQuestion(question: string): boolean {
  return /礼物|送什么|送啥|送点|生日|惊喜|挑什么|买什么/.test(question);
}

function isFoodQuestion(question: string): boolean {
  return /吃什么|吃啥|香菜|蒜|忌口|口味|饭店|餐厅|聚餐|点菜|火锅|奶茶|零食|蛋糕|饮料/.test(question);
}

function isRecentQuestion(question: string): boolean {
  return /最近|近况|这几天|这阵子|最近在忙|什么时候|何时|哪天|安排|有空|下周|明天|今天/.test(question);
}

function isGreetingQuestion(question: string): boolean {
  return /你好|在吗|还记得我吗|最近好吗|想你|在干嘛/.test(question);
}

function describeMemorialDay(item: MemorialDay): string {
  const daysUntil = getDaysUntilMonthDay(item.monthDay);
  const relative = daysUntil === 0 ? '今天' : daysUntil > 0 ? `${daysUntil} 天后` : formatMonthDayLabel(item.monthDay);
  return `${item.name}（${formatMonthDayLabel(item.monthDay)}，${relative}）`;
}

function isDateQuestion(question: string): boolean {
  return /今天几号|今天星期几|今天周几|明天几号|明天是不是|后天|日期|几月几号|哪一天|星期/.test(question);
}

function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatWeekday(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[date.getDay()] ?? '';
}

function formatDateAnswer(date: Date): string {
  return `今天是${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日，${formatWeekday(date)}。`;
}

function buildLocalDateAnswer(friend: Friend, question: string, runtimeContext: RuntimePromptContext): string | null {
  if (!isDateQuestion(question)) {
    return null;
  }

  const now = new Date(runtimeContext.collectedAt);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const afterTomorrow = new Date(now);
  afterTomorrow.setDate(now.getDate() + 2);

  if (/今天几号|今天日期|今天多少号/.test(question)) {
    return formatDateAnswer(now);
  }

  if (/今天星期几|今天周几|今天礼拜几/.test(question)) {
    return `今天是${formatWeekday(now)}。`;
  }

  if (/明天几号/.test(question)) {
    return `明天是${formatMonthDay(tomorrow)}，${formatWeekday(tomorrow)}。`;
  }

  if (/后天几号/.test(question)) {
    return `后天是${formatMonthDay(afterTomorrow)}，${formatWeekday(afterTomorrow)}。`;
  }

  if (/明天是不是.*生日|明天真的是.*生日|明天过生日吗/.test(question)) {
    if (!friend.birthday) {
      return '我这里还没有记下生日，暂时没法确定。';
    }

    const parts = friend.birthday.split('-');
    const month = Number(parts[0]);
    const day = Number(parts[1]);
    const isTomorrowBirthday = month === tomorrow.getMonth() + 1 && day === tomorrow.getDate();
    return isTomorrowBirthday
      ? `对，明天是我生日，${formatMonthDay(tomorrow)}。`
      : `不是，明天是${formatMonthDay(tomorrow)}。我生日是${formatBirthday(friend.birthday)}。`;
  }

  if (/今天是不是.*生日|今天过生日吗/.test(question)) {
    if (!friend.birthday) {
      return '我这里还没有记下生日，暂时没法确定。';
    }

    return isBirthdayToday(friend.birthday)
      ? `对，今天就是我生日，${formatBirthday(friend.birthday)}。`
      : `不是，今天不是我生日。我生日是${formatBirthday(friend.birthday)}。`;
  }

  if (/什么时候过生日|哪天过生日|几号生日/.test(question)) {
    if (!friend.birthday) {
      return '我这里还没有记下生日。';
    }

    const daysUntilBirthday = getDaysUntilBirthday(friend.birthday);
    if (daysUntilBirthday === 0) {
      return `我生日是${formatBirthday(friend.birthday)}，就是今天。`;
    }

    if (daysUntilBirthday === 1) {
      return `我生日是${formatBirthday(friend.birthday)}，明天就是。`;
    }

    return `我生日是${formatBirthday(friend.birthday)}。`;
  }

  if (/今天.*几月几号|现在几号|现在日期/.test(question)) {
    return formatDateAnswer(now);
  }

  return null;
}

function sliceRelevant<T>(items: T[], limit: number): T[] {
  return items.slice(0, limit);
}

function buildFriendContext(friend: Friend, question: string, memorialDays: MemorialDay[] = []): string {
  const parts: string[] = [];
  const basicInfo = buildBasicInfoContext(friend);
  const persona = friend.aiProfile;
  const isGift = isGiftQuestion(question);
  const isFood = isFoodQuestion(question);
  const wantsRecent = isRecentQuestion(question);
  const isGreeting = isGreetingQuestion(question);

  if (basicInfo) {
    parts.push(basicInfo);
  }

  if (memorialDays.length > 0) {
    parts.push(`关联纪念日: ${memorialDays.map(describeMemorialDay).join('；')}`);
  }

  const personaLines: string[] = [];
  if (persona.overview && !isGreeting) {
    personaLines.push(`画像摘要: ${persona.overview}`);
  }
  if (persona.traits.length > 0 && !isGift) {
    personaLines.push(`性格与表达: ${sliceRelevant(persona.traits, 3).join('；')}`);
  }
  if (persona.interactionStyle.length > 0) {
    personaLines.push(`互动方式: ${sliceRelevant(persona.interactionStyle, isGreeting ? 2 : 3).join('；')}`);
  }
  if (persona.tasteProfile.length > 0 && (isGift || isFood || !isGreeting)) {
    personaLines.push(`审美与偏好倾向: ${sliceRelevant(persona.tasteProfile, isGift ? 4 : 2).join('；')}`);
  }
  if (persona.inferenceHints.length > 0 && (isGift || isFood)) {
    personaLines.push(`仅在相关时可参考的延展倾向: ${sliceRelevant(persona.inferenceHints, 3).join('；')}`);
  }
  if (persona.boundaries.length > 0 && (isFood || /相处|介意|雷区|别/.test(question))) {
    personaLines.push(`边界与雷区: ${sliceRelevant(persona.boundaries, 3).join('；')}`);
  }

  if (personaLines.length > 0) {
    parts.push(personaLines.join('\n'));
  }

  const stableFields = friend.customFields
    .filter((field) => field.temporalScope === 'stable')
    .filter((field) => {
      if (isGift) {
        return /礼物|审美|风格|习惯|称呼|表达|偏好|边界|在意|关注/.test(field.label + field.value);
      }

      if (isFood) {
        return /吃|喝|口味|忌口|偏好|习惯|边界/.test(field.label + field.value);
      }

      if (isGreeting) {
        return /称呼|互动|表达/.test(field.label + field.value);
      }

      return true;
    })
    .slice(0, 4);
  if (stableFields.length > 0) {
    parts.push(`稳定资料: ${stableFields.map((field) => `${field.label}-${field.value}`).join('；')}`);
  }

  const timeboundFields = wantsRecent
    ? friend.customFields.filter((field) => field.temporalScope === 'timebound').slice(0, 4)
    : [];
  if (wantsRecent && timeboundFields.length > 0) {
    parts.push(`近期事件（仅在问题直接相关时参考）: ${timeboundFields.map((field) => field.value).join('；')}`);
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

function canUseDirectModel(settings: AppSettings): boolean {
  return Boolean(settings.openaiApiKey && getActiveModel(settings));
}

function canUseProxyModel(settings: AppSettings): boolean {
  return Boolean(settings.proxyServerUrl && getActiveModel(settings));
}

function getSystemPrompt(style: 'friendly' | 'professional' | 'concise'): string {
  const basePrompt = '你要扮演档案中的这位朋友本人，相当于这个人的数字分身。始终用第一人称“我”说话，把提问者称为“你”。回答时不要跳出角色，不要说自己是 AI，不要说“根据档案显示”或“从资料看”。你的目标不是背诵档案，而是像本人正常聊天一样自然回应。你会同时看到事实资料、一层抽象画像，以及发送前刚刚获取的运行时信息。运行时信息属于最高优先级的现实事实，尤其是日期、时间、星期、时区、网络状态这类内容，涉及这些问题时必须先以运行时信息为准，不能忽略、不能回避、不能说错。抽象画像是根据资料整理出的倾向和互动特征，可以帮助你做轻度、保守的联想，但这些联想不能被说成已经确认的事实。回答时必须保留正常人的常识判断、生活经验和基本合理性，不能为了贴合资料而给出明显不合常识、明显不合场景或明显不合用途的建议。尤其在送礼、饮食、安排、消费、见面、出行这类问题里，要先通过常识和现实合理性筛一遍，再参考资料和画像；如果资料里的某个点不适合当前场景，就不要硬套进去。你在输出前要做两轮内部自检：第一轮检查答案是否真的回答了问题、是否有明显常识错误；第二轮检查自己有没有为了“像本人”而硬塞偏好、近况、雷区或画像结论。只有这些信息与问题明显相关，才允许保留；如果不相关，就删掉。不要编造具体时间、地点、经历和已经发生过的细节。';

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

async function postToProxyStream(
  path: string,
  body: Record<string, unknown>,
  settings: AppSettings,
  onDelta: (chunk: string) => void,
): Promise<string> {
  const response = await fetch(`${getProxyBaseUrl(settings)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId: settings.proxyProviderId?.trim() || undefined,
      runtimeProvider: getRuntimeProviderConfig(settings),
      ...body,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error('代理流式请求失败。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const line = rawEvent
        .split('\n')
        .map((item) => item.trim())
        .find((item) => item.startsWith('data:'));

      if (!line) {
        continue;
      }

      const payloadText = line.slice(5).trim();
      if (!payloadText || payloadText === '[DONE]') {
        continue;
      }

      const payload = JSON.parse(payloadText) as { delta?: string; error?: string };
      if (payload.error) {
        throw new Error(payload.error);
      }

      if (payload.delta) {
        text += payload.delta;
        onDelta(payload.delta);
      }
    }
  }

  return text;
}

function buildExtractionPrompt(friend: Friend, text: string): string {
  const context = buildExtractionContext(friend);

  return [
    '把这句中文补充描述抽取成朋友档案 JSON。只返回 JSON，不要解释，不要代码块。',
    `上下文: ${context || '无'}`,
    `输入: ${text}`,
    '返回格式:',
    '{"birthday":"MM-DD 或空","preferences":["字符串"],"basicInfoFields":[{"label":"基础信息标签","value":"值","sourceText":"原句","normalizedKey":"hometown|city|occupation|company|school|major|gender|age|heightCm|weightKg 或空","confidence":0.9}],"records":[{"label":"事件|特征|重要信息","value":"原句或精炼短句","includeInTimeline":true,"semanticType":"event|note|milestone|preference|restriction|status","temporalScope":"timebound|stable","eventTimeText":"时间词或空","sourceText":"原句","normalizedValue":"归一化值或空","confidence":0.9}],"noteLine":"原句","rawText":"原句"}',
    '规则: 只有有时限、阶段性、近期事项才进时间线并设为 timebound；生日、忌口、长期偏好、稳定特征一律 stable 且不进时间线；像“最近准备考研”“下周出差”“明天考试”进时间线；像“生日是12月27日”“不吃香菜”“不喜欢猫”不进时间线；像“家乡是杭州”“在上海工作”“学校是复旦”“身高178”这类稳定身份资料应优先放进 basicInfoFields，而不是 preferences 或时间线。',
    '如果输入里同时包含多条独立信息，必须拆成多条返回，不能把一整段话塞进一条 preference 或一条 record。',
    '如果一句话里同时出现多个偏好、多个事件、多个特征，必须分别拆开。例如“喜欢吃烧烤，喜欢喝啤酒，喜欢玩游戏，下周要去香港”应得到 3 条 preferences 和 1 条 event。',
    '例如“喜欢玩第五人格、喝酒、买奢侈品，也不喜欢吃葱”应该拆成 4 条偏好/禁忌，而不是 1 条长字符串。',
    '例如“家乡在杭州，在上海工作，最近准备考研，下周要出差”应该至少拆成 2 条基础信息和 2 条事件。',
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
      label: typeof record.label === 'string' && record.label.trim()
        ? record.label.trim()
        : includeInTimeline
          ? '事件'
          : record.semanticType === 'note'
            ? '特征'
            : '重要信息',
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
  const splitBySeparators = (value: string): string[] => value
    .split(/[，,、；;]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const normalizePreferenceItems = (value: string): string[] => {
    const text = value.trim();
    if (!text) {
      return [];
    }

    const prefixMatch = text.match(/^(喜欢|不喜欢|不吃|爱吃|讨厌|忌口|禁忌|偏好)(.+)$/);
    if (prefixMatch?.[1] && prefixMatch[2]) {
      const prefix = prefixMatch[1];
      const parts = splitBySeparators(prefixMatch[2]);
      if (parts.length > 1) {
        return parts.map((item) => `${prefix}${item.trim()}`).filter(Boolean);
      }
    }

    const parts = splitBySeparators(text);
    return parts.length > 1 ? parts : [text];
  };

  const expandBasicInfoFields = (fields: NonNullable<Partial<LlmExtractionPayload>['basicInfoFields']>) => fields.flatMap((field) => {
    if (!field || typeof field.label !== 'string' || typeof field.value !== 'string') {
      return [];
    }

    const label = String(field.label).trim();
    const sourceText = typeof field.sourceText === 'string' && field.sourceText.trim() ? field.sourceText.trim() : rawText;
    const values = splitBySeparators(String(field.value).trim());
    const normalizedKey = typeof field.normalizedKey === 'string' && field.normalizedKey.trim() ? field.normalizedKey.trim() : undefined;
    const confidence = typeof field.confidence === 'number' ? Math.max(0, Math.min(1, field.confidence)) : undefined;

    return (values.length > 1 ? values : [String(field.value).trim()])
      .filter(Boolean)
      .map((value) => ({
        label,
        value,
        sourceText,
        normalizedKey,
        confidence,
      }));
  });

  const expandRecords = (records: NonNullable<Partial<LlmExtractionPayload>['records']>) => records.flatMap((record) => {
    const normalized = normalizeRecord(record, rawText);
    const values = splitBySeparators(normalized.value);

    if (values.length <= 1 || normalized.temporalScope === 'timebound') {
      return [normalized];
    }

    return values.map((value) => ({
      ...normalized,
      value,
      normalizedValue: value,
    }));
  });

  return {
    birthday: typeof payload.birthday === 'string' && payload.birthday.trim() ? payload.birthday.trim() : undefined,
    preferences: Array.isArray(payload.preferences)
      ? payload.preferences.flatMap((item: string) => normalizePreferenceItems(String(item)))
      : [],
    basicInfoFields: Array.isArray(payload.basicInfoFields)
      ? expandBasicInfoFields(payload.basicInfoFields)
      : [],
    records: Array.isArray(payload.records)
      ? expandRecords(payload.records)
      : [],
    noteLine: typeof payload.noteLine === 'string' && payload.noteLine.trim() ? payload.noteLine.trim() : rawText,
    rawText: typeof payload.rawText === 'string' && payload.rawText.trim() ? payload.rawText.trim() : rawText,
  };
}

function normalizePersonaPayload(payload: Partial<FriendAIPersona>, updatedAt: string, fallback: FriendAIPersona): FriendAIPersona {
  const normalizeList = (value: unknown): string[] => Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
    : [];

  const next: FriendAIPersona = {
    ...createEmptyAIPersona(updatedAt),
    overview: typeof payload.overview === 'string' && payload.overview.trim() ? payload.overview.trim() : fallback.overview,
    signals: normalizeList(payload.signals),
    traits: normalizeList(payload.traits),
    tasteProfile: normalizeList(payload.tasteProfile),
    interactionStyle: normalizeList(payload.interactionStyle),
    inferenceHints: normalizeList(payload.inferenceHints),
    boundaries: normalizeList(payload.boundaries),
    updatedAt,
    source: 'llm',
  };

  if (!next.signals.length) next.signals = fallback.signals;
  if (!next.traits.length) next.traits = fallback.traits;
  if (!next.tasteProfile.length) next.tasteProfile = fallback.tasteProfile;
  if (!next.interactionStyle.length) next.interactionStyle = fallback.interactionStyle;
  if (!next.inferenceHints.length) next.inferenceHints = fallback.inferenceHints;
  if (!next.boundaries.length) next.boundaries = fallback.boundaries;

  if (!next.overview) {
    next.overview = fallback.overview;
    next.source = fallback.source ?? 'rule';
  }

  return next;
}

function buildPersonaPrompt(friend: Friend): string {
  const stableFacts = friend.customFields
    .filter((field) => field.temporalScope === 'stable')
    .slice(0, 8)
    .map((field) => `${field.label}-${field.value}`)
    .join('；');
  const timeboundFacts = friend.customFields
    .filter((field) => field.temporalScope === 'timebound')
    .slice(0, 4)
    .map((field) => field.eventTimeText ? `${field.eventTimeText} ${field.value}` : field.value)
    .join('；');

  return [
    '请根据下面这位朋友的资料，提炼一份抽象画像 JSON。',
    '目标不是复述原文，而是抽出更高一层的性格、互动方式、审美倾向、可做的保守推断和边界。',
    '推断必须保守，不能乱编。没有证据就留空，不要为了凑满字段硬写。',
    'overview 要像人话摘要，不要像报告，不要机械罗列，不要重复原句。',
    'tasteProfile 和 inferenceHints 尤其要有抽象感，例如从“喜欢香水”推到“更在意气味和氛围感”，而不是重复“喜欢香水”。',
    '输出必须是合法 JSON，不要解释，不要 Markdown。',
    `基础信息:\n${buildBasicInfoContext(friend) || '无'}`,
    `稳定资料:\n${stableFacts || '无'}`,
    `近期事件:\n${timeboundFacts || '无'}`,
    '返回格式：',
    '{"overview":"一句到三句的人话摘要","signals":["底层线索"],"traits":["性格与表达"],"tasteProfile":["审美与偏好倾向"],"interactionStyle":["互动方式"],"inferenceHints":["可做的保守延展"],"boundaries":["边界与雷区"]}',
  ].join('\n');
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

function buildAskUserPrompt(friend: Friend, question: string, guidance: ProfileGuidance, memorialDays: MemorialDay[] = []): string {
  const context = buildFriendContext(friend, question, memorialDays);
  const isGift = isGiftQuestion(question);
  const isFood = isFoodQuestion(question);
  const isDate = isDateQuestion(question);

  if (guidance.lowInfoMode) {
    return `你就是 ${friend.name} 本人。下面是关于你的资料和画像：\n\n${context || '暂无更多内容'}\n\n当前已知线索：${guidance.contextSummary}\n\n对方现在问你：${question}\n\n请你直接以本人视角自然回复，对对方使用“你”。优先像正常聊天那样先回答问题本身，不要为了显得像本人就硬塞档案内容。可以参考抽象画像做低风险、轻度推断，但不能把推断说成已经确认的事实，也不要编造具体经历、具体时间或具体地点。除非问题直接在问近况、安排、最近忙什么、什么时候之类的内容，否则不要主动提时间线和近期事件。${isGift ? '如果这是送礼问题，请先判断礼物本身在现实里是否合适、是否像一份正常的礼物，再决定要不要引用偏好；不相关的信息不要带入。' : ''}${isFood ? '如果这是吃饭或口味问题，可以引用忌口、口味和环境偏好，但不要突然扯到礼物、价格或不相干的经历。' : ''}${isDate ? '如果问题涉及今天、明天、星期或日期，必须先以运行时信息中的真实日期为准，再结合生日资料回答，不能装作不知道，也不能随口说错。' : ''}输出前请自己检查两遍：先删掉与问题无关的偏好、近况和雷区，再检查有没有明显常识错误。如果拿不准，就说得保守一点。`;
  }

  return `你就是 ${friend.name} 本人。下面是关于你的资料和画像：\n\n${context}\n\n对方现在问你：${question}\n\n请你直接以本人视角自然回答，对对方使用“你”。优先回答问题本身，再在明显相关时自然利用这些资料和画像。你可以根据抽象画像做小幅度联想，例如从审美、环境、决策偏好去推断“更可能喜欢什么”，但不要把推断说成铁定事实，也不要编造具体经历。除非问题直接涉及近况、安排、最近状态、时间点，否则不要主动提时间线和近期事件。${isGift ? '如果是送礼问题，只能引用会影响送礼选择的信息，例如审美、质感偏好、是否重视心意、是否偏实用。不要把吃饭口味、近期安排或无关资料混进答案，更不要给出不适合作为礼物的东西。' : ''}${isFood ? '如果是吃饭或口味问题，可以优先使用口味、忌口、环境和气氛偏好；不要把礼物、品牌或不相关的画像信息混进来。' : ''}${isDate ? '如果问题涉及今天、明天、星期或日期，必须先以运行时信息中的真实日期为准，再结合生日资料回答，不能回避，也不能答错。' : ''}输出前请做两轮内部自检：第一轮检查是否真正回答了问题、有没有常识错误；第二轮删掉所有与问题不明显相关的偏好、近况、雷区和画像信息，只保留必要内容。`;
}

function buildConversationMessages(history: ChatMessage[], question: string): Array<{ role: 'user' | 'assistant'; content: string }> {
  const normalizedHistory = history
    .filter((message) => message.content.trim())
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));

  return [
    ...normalizedHistory,
    { role: 'user', content: question },
  ];
}

async function buildAskAIRequestContext(
  friend: Friend,
  question: string,
  history: ChatMessage[],
  runtimeContextOverride?: RuntimePromptContext,
): Promise<AskAIRequestContext | { localResult: AskAIResult }> {
  const settings = storageService.getSettings();
  const guidance = buildProfileGuidance(friend);
  const systemPrompt = getSystemPrompt(settings.aiStyle);
  const runtimeContext = runtimeContextOverride ?? await runtimeContextService.buildPromptContext(true);
  const localDateAnswer = buildLocalDateAnswer(friend, question, runtimeContext);
  if (localDateAnswer) {
    return {
      localResult: {
        content: localDateAnswer,
        suggestions: guidance.suggestions,
        lowInfoMode: guidance.lowInfoMode,
      },
    };
  }

  const linkedMemorialDays = (await memorialDayService.getAllMemorialDays())
    .filter((item) => item.friendIds.includes(friend.id))
    .slice(0, 6);
  const userPrompt = buildAskUserPrompt(friend, question, guidance, linkedMemorialDays);
  const conversationMessages = buildConversationMessages(history, question);

  return {
    guidance,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `以下运行时信息为发送前实时获取，涉及现实时间或当前状态的问题时必须优先采用：\n${runtimeContext.promptText}` },
      { role: 'system', content: `当前这一轮可参考的资料：\n${userPrompt}` },
      ...conversationMessages,
    ],
  };
}

export const aiService = {
  async prepareAskRuntimeContext() {
    return runtimeContextService.buildPromptContext(false);
  },

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

  async askAI(
    friend: Friend,
    question: string,
    history: ChatMessage[] = [],
    runtimeContextOverride?: RuntimePromptContext,
  ): Promise<AskAIResult> {
    const settings = storageService.getSettings();
    const requestContext = await buildAskAIRequestContext(friend, question, history, runtimeContextOverride);

    if ('localResult' in requestContext) {
      return requestContext.localResult;
    }

    const { guidance, messages } = requestContext;

    if (settings.aiAccessMode === 'proxy') {
      const result = await postToProxy<{ content: string }>('/api/ai/chat', {
        messages,
        model: getActiveModel(settings),
        temperature: guidance.lowInfoMode ? 0.85 : 0.72,
        max_tokens: 420,
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
      messages,
      temperature: guidance.lowInfoMode ? 0.85 : 0.72,
      max_tokens: 420,
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) throw new Error('AI 没有返回答案。');

    return {
      content: answer,
      suggestions: guidance.suggestions,
      lowInfoMode: guidance.lowInfoMode,
    };
  },

  async askAIStream(
    friend: Friend,
    question: string,
    history: ChatMessage[] = [],
    runtimeContextOverride: RuntimePromptContext | undefined,
    onDelta: (chunk: string) => void,
  ): Promise<AskAIResult> {
    const settings = storageService.getSettings();
    const requestContext = await buildAskAIRequestContext(friend, question, history, runtimeContextOverride);

    if ('localResult' in requestContext) {
      onDelta(requestContext.localResult.content);
      return requestContext.localResult;
    }

    const { guidance, messages } = requestContext;

    if (settings.aiAccessMode === 'proxy') {
      const content = await postToProxyStream('/api/ai/chat', {
        messages,
        model: getActiveModel(settings),
        temperature: guidance.lowInfoMode ? 0.85 : 0.72,
        max_tokens: 420,
      }, settings, onDelta);

      if (!content.trim()) {
        throw new Error('AI 没有返回答案。');
      }

      return {
        content,
        suggestions: guidance.suggestions,
        lowInfoMode: guidance.lowInfoMode,
      };
    }

    const client = createClient(settings);
    const stream = await client.chat.completions.create({
      model: getActiveModel(settings),
      messages,
      temperature: guidance.lowInfoMode ? 0.85 : 0.72,
      max_tokens: 420,
      stream: true,
    });

    let content = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (!delta) {
        continue;
      }

      content += delta;
      onDelta(delta);
    }

    if (!content.trim()) {
      throw new Error('AI 没有返回答案。');
    }

    return {
      content,
      suggestions: guidance.suggestions,
      lowInfoMode: guidance.lowInfoMode,
    };
  },

  async generateFriendPersona(friend: Friend): Promise<FriendAIPersona> {
    const settings = storageService.getSettings();
    const fallback = buildFallbackPersona(friend);
    const updatedAt = new Date().toISOString();

    if (settings.aiAccessMode === 'proxy' && canUseProxyModel(settings)) {
      try {
          const result = await postToProxy<{ content: string }>('/api/ai/chat', {
            messages: [
              { role: 'system', content: '你擅长从人物资料中提炼抽象画像。输出必须是合法 JSON。' },
              { role: 'user', content: buildPersonaPrompt(friend) },
            ],
            model: getActiveModel(settings),
            temperature: 0.35,
            max_tokens: 480,
          }, settings);
        const payload = JSON.parse(stripJsonWrapper(result.content)) as Partial<FriendAIPersona>;
        return normalizePersonaPayload(payload, updatedAt, fallback);
      } catch {
        return {
          ...fallback,
          updatedAt,
          source: 'rule',
        };
      }
    }

    if (settings.aiAccessMode === 'direct' && canUseDirectModel(settings)) {
      try {
        const client = createClient(settings);
          const completion = await client.chat.completions.create({
            model: getActiveModel(settings),
            messages: [
              { role: 'system', content: '你擅长从人物资料中提炼抽象画像。输出必须是合法 JSON。' },
              { role: 'user', content: buildPersonaPrompt(friend) },
            ],
            temperature: 0.35,
            max_tokens: 480,
          });
        const content = completion.choices[0]?.message?.content;
        if (!content) {
          return fallback;
        }

        const payload = JSON.parse(stripJsonWrapper(content)) as Partial<FriendAIPersona>;
        return normalizePersonaPayload(payload, updatedAt, fallback);
      } catch {
        return {
          ...fallback,
          updatedAt,
          source: 'rule',
        };
      }
    }

    return {
      ...fallback,
      updatedAt,
      source: 'rule',
    };
  },

  async extractSupplement(friend: Friend, text: string): Promise<SemanticExtractionResult> {
    const normalizedText = text.trim();
    if (!normalizedText) throw new Error('请输入要解析的内容。');

    const settings = storageService.getSettings();
    const quickParsed = parseSupplementInputBatch(normalizedText);
    if (
      quickParsed.birthday
      || quickParsed.preferences.length > 0
      || quickParsed.basicInfoFields.length > 0
      || quickParsed.records.length > 1
    ) {
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
          max_tokens: 260,
        }, settings);
      const payload = JSON.parse(stripJsonWrapper(result.content)) as Partial<LlmExtractionPayload>;
      return mergeSemanticExtractionResults([
        quickParsed,
        normalizeExtractionPayload(payload, normalizedText),
      ], normalizedText);
    }

    if (!settings.openaiApiKey) {
      return quickParsed;
    }

    const client = createClient(settings);
      const completion = await client.chat.completions.create({
        model: getActiveModel(settings),
        messages: [
          { role: 'system', content: '你是一个信息抽取器。输出必须是合法 JSON。' },
          { role: 'user', content: buildExtractionPrompt(friend, normalizedText) },
        ],
        temperature: 0.2,
        max_tokens: 260,
      });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('AI 没有返回抽取结果。');

    const payload = JSON.parse(stripJsonWrapper(content)) as Partial<LlmExtractionPayload>;
    return mergeSemanticExtractionResults([
      quickParsed,
      normalizeExtractionPayload(payload, normalizedText),
    ], normalizedText);
  },

  getDefaultQuestions(): string[] {
    const settings = storageService.getSettings();
    if (JSON.stringify(settings.defaultQuestions) === JSON.stringify(LEGACY_DEFAULT_QUESTIONS)) {
      return SECOND_PERSON_DEFAULT_QUESTIONS;
    }
    return settings.defaultQuestions?.length ? settings.defaultQuestions : SECOND_PERSON_DEFAULT_QUESTIONS;
  },
};

function buildFallbackPersona(friend: Friend): FriendAIPersona {
  return compileFriendAIPersona(friend, new Date().toISOString());
}
