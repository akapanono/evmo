import type { SemanticType, TemporalScope } from '@/types/friend';
import type { BasicInfoExtractionField, SemanticExtractionRecord, SemanticExtractionResult } from '@/types/extraction';

const EXPLICIT_TIME_PATTERN = /今天|明天|后天|今晚|明早|明晚|下周|这周|本周|月底|月初|月中|下个月|近期|即将|周[一二三四五六日天]/;
const FUZZY_TIME_PATTERN = /最近|马上|过阵子|这阵子|这段时间|近来|近期|短期|中期|长期|之后|随后|稍后|尽快|改天|回头|未来一段时间/;
const STATUS_PATTERN = /在忙|准备|打算|计划|正在|考研|考试|出差|搬家|住院|工作变动|实习|入职|离职|装修|旅行|备婚|求职/;
const TIMEBOUND_PATTERN = /最近|这周|本周|今天|明天|后天|今晚|明早|明晚|下周|月底|月初|月中|下个月|近期|现在|正在|在忙|准备|打算|计划|要|即将|马上|报名|考研|考试|出差|搬家|住院|工作变动|中期|长期|短期|未来一段时间|稍后|随后|尽快|过阵子|这段时间|近来/;
const PREFERENCE_PATTERN = /不吃|不喜欢|讨厌|禁忌|忌口|雷区|喜欢|爱吃|偏好|爱好|想要/;
const SENTENCE_SEPARATOR_PATTERN = /[\r\n]+|[；;]+|[。！？!?]+|[，,]+/;
const PREFERENCE_VALUE_SEPARATOR_PATTERN = /[、/]|(?:以及|还有|及|和)/;

function toBirthday(month: string, day: string): string | undefined {
  const monthNum = Number(month);
  const dayNum = Number(day);

  if (!Number.isInteger(monthNum) || !Number.isInteger(dayNum)) {
    return undefined;
  }

  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return undefined;
  }

  return `${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
}

function extractBirthday(text: string): string | undefined {
  const chineseMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (chineseMatch && chineseMatch[1] && chineseMatch[2]) {
    return toBirthday(chineseMatch[1], chineseMatch[2]);
  }

  const dashMatch = text.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if (dashMatch && dashMatch[1] && dashMatch[2]) {
    return toBirthday(dashMatch[1], dashMatch[2]);
  }

  return undefined;
}

function normalizePreferenceValue(value: string): string {
  return value
    .trim()
    .replace(/^(对|很|太|比较|有点|特别)/, '')
    .replace(/(这件事|这个|这种|这一类)$/, '')
    .trim();
}

function normalizePreferenceItem(value: string): string {
  return normalizePreferenceValue(value).replace(/^吃(?=.{1,6}$)/, '').trim();
}

function splitPreferenceValues(value: string): string[] {
  const normalized = normalizePreferenceValue(value);
  if (!normalized) {
    return [];
  }

  const parts = normalized
    .split(PREFERENCE_VALUE_SEPARATOR_PATTERN)
    .map((item) => normalizePreferenceItem(item))
    .filter(Boolean);

  return parts.length > 0 ? parts : [normalizePreferenceItem(normalized)];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function extractPreferences(text: string): string[] {
  const rules: Array<{ pattern: RegExp; formatter: (value: string) => string }> = [
    { pattern: /不喜欢([^，。；,]+)/g, formatter: (value) => `不喜欢${value}` },
    { pattern: /讨厌([^，。；,]+)/g, formatter: (value) => `不喜欢${value}` },
    { pattern: /不吃([^，。；,]+)/g, formatter: (value) => `不吃${value}` },
    { pattern: /禁忌([^，。；,]+)/g, formatter: (value) => `禁忌${value}` },
    { pattern: /忌口([^，。；,]+)/g, formatter: (value) => `忌口${value}` },
    { pattern: /雷区([^，。；,]+)/g, formatter: (value) => `雷区${value}` },
    { pattern: /喜欢([^，。；,]+)/g, formatter: (value) => value },
    { pattern: /爱吃([^，。；,]+)/g, formatter: (value) => value },
    { pattern: /偏好([^，。；,]+)/g, formatter: (value) => value },
    { pattern: /爱好([^，。；,]+)/g, formatter: (value) => value },
  ];

  let remaining = text;
  const results: string[] = [];

  for (const rule of rules) {
    const matches = Array.from(remaining.matchAll(rule.pattern));
    for (const matched of matches) {
      const rawValue = matched[1];
      if (!rawValue) {
        continue;
      }

      const values = splitPreferenceValues(rawValue);
      results.push(...values.map((value) => rule.formatter(value)).filter(Boolean));
    }

    remaining = remaining.replace(rule.pattern, ' ');
  }

  return uniqueStrings(results);
}

function extractBasicInfo(text: string): BasicInfoExtractionField[] {
  const rules: Array<{ pattern: RegExp; label: string; normalizedKey: string }> = [
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?家乡(?:是|在)?([^，。；,]+)/g, label: '家乡', normalizedKey: 'hometown' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?(?:常住城市|所在城市|城市)(?:是|在)?([^，。；,]+)/g, label: '常住城市', normalizedKey: 'city' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?职业(?:是)?([^，。；,]+)/g, label: '职业', normalizedKey: 'occupation' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?公司(?:是|在)?([^，。；,]+)/g, label: '公司', normalizedKey: 'company' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?学校(?:是|在)?([^，。；,]+)/g, label: '学校', normalizedKey: 'school' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?专业(?:是)?([^，。；,]+)/g, label: '专业', normalizedKey: 'major' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?性别(?:是)?([^，。；,]+)/g, label: '性别', normalizedKey: 'gender' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?年龄(?:是)?(\d{1,3})/g, label: '年龄', normalizedKey: 'age' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?身高(?:是)?(\d{2,3}(?:\.\d+)?)\s*(?:cm|厘米)?/gi, label: '身高', normalizedKey: 'heightCm' },
    { pattern: /(?:我的|他(?:的)?|她(?:的)?|TA(?:的)?)?体重(?:是)?(\d{1,3}(?:\.\d+)?)\s*(?:kg|公斤|斤)?/gi, label: '体重', normalizedKey: 'weightKg' },
  ];

  const results: BasicInfoExtractionField[] = [];

  for (const rule of rules) {
    const matches = Array.from(text.matchAll(rule.pattern));
    for (const matched of matches) {
      if (!matched[1]) {
        continue;
      }

      results.push({
        label: rule.label,
        value: matched[1].trim(),
        sourceText: text,
        normalizedKey: rule.normalizedKey,
        confidence: 0.82,
      });
    }
  }

  if (results.length > 0) {
    return dedupeByKey(results, (field) => `${field.normalizedKey ?? field.label}::${field.value}`);
  }

  const customMatch = text.match(/^([^：:，。,；;]{1,12})[：:](.+)$/);
  if (customMatch?.[1] && customMatch[2]) {
    return [{
      label: customMatch[1].trim(),
      value: customMatch[2].trim(),
      sourceText: text,
      confidence: 0.72,
    }];
  }

  const relationLikeMatch = text.match(/^([^，。；,]{1,10})(?:是|在|叫做|叫)([^，。；,]{1,24})$/);
  if (relationLikeMatch?.[1] && relationLikeMatch[2] && !TIMEBOUND_PATTERN.test(text) && !PREFERENCE_PATTERN.test(text)) {
    const label = relationLikeMatch[1].trim();
    const value = relationLikeMatch[2].trim();
    if (!/最近|今天|明天|下周|准备|喜欢|讨厌|不吃/.test(label + value)) {
      return [{
        label,
        value,
        sourceText: text,
        confidence: 0.62,
      }];
    }
  }

  return [];
}

function extractEventTimeText(text: string): string | undefined {
  const matched = text.match(/最近|马上|中期|长期|短期|近期|即将|尽快|过阵子|这阵子|这段时间|近来|未来一段时间|今天|明天|后天|今晚|明早|明晚|下周|这周|本周|月底|月初|月中|下个月|周[一二三四五六日天]/);
  return matched?.[0];
}

function buildRecord(
  sourceText: string,
  config: {
    semanticType: SemanticType;
    temporalScope: TemporalScope;
    includeInTimeline: boolean;
    eventTimeText?: string;
    label?: string;
  },
): SemanticExtractionRecord {
  const label = config.label ?? (config.includeInTimeline || config.temporalScope === 'timebound' ? '事件' : '特征');

  return {
    label,
    value: sourceText,
    includeInTimeline: config.includeInTimeline,
    semanticType: config.semanticType,
    temporalScope: config.temporalScope,
    extractionMethod: 'rule',
    sourceText,
    eventTimeText: config.eventTimeText,
    normalizedValue: sourceText,
    confidence: 0.72,
  };
}

function classifyRecord(text: string): SemanticExtractionRecord {
  const eventTimeText = extractEventTimeText(text);

  if (EXPLICIT_TIME_PATTERN.test(text)) {
    return buildRecord(text, {
      semanticType: 'event',
      temporalScope: 'timebound',
      includeInTimeline: true,
      eventTimeText,
    });
  }

  if (FUZZY_TIME_PATTERN.test(text) || STATUS_PATTERN.test(text)) {
    return buildRecord(text, {
      semanticType: 'event',
      temporalScope: 'timebound',
      includeInTimeline: true,
      eventTimeText,
    });
  }

  const timebound = TIMEBOUND_PATTERN.test(text);

  return buildRecord(text, {
    semanticType: timebound ? 'event' : 'note',
    temporalScope: timebound ? 'timebound' : 'stable',
    includeInTimeline: timebound,
    eventTimeText,
  });
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function splitSupplementSegments(text: string): string[] {
  return text
    .split(SENTENCE_SEPARATOR_PATTERN)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function parseSupplementInput(text: string): SemanticExtractionResult {
  const normalized = text.trim();

  if (!normalized) {
    return {
      birthday: undefined,
      preferences: [],
      basicInfoFields: [],
      records: [],
      noteLine: '',
      rawText: '',
    };
  }

  const birthday = extractBirthday(normalized);
  const preferences = extractPreferences(normalized);
  const basicInfoFields = extractBasicInfo(normalized);
  const shouldCreateRecord = !birthday && preferences.length === 0 && basicInfoFields.length === 0;

  return {
    birthday,
    preferences,
    basicInfoFields,
    records: shouldCreateRecord ? [classifyRecord(normalized)] : [],
    noteLine: normalized,
    rawText: normalized,
  };
}

export function mergeSemanticExtractionResults(
  results: SemanticExtractionResult[],
  rawText: string,
): SemanticExtractionResult {
  const preferenceSet = new Set<string>();
  let birthday: string | undefined;

  for (const result of results) {
    if (result.birthday) {
      birthday = result.birthday;
    }

    for (const preference of result.preferences) {
      preferenceSet.add(preference);
    }
  }

  return {
    birthday,
    preferences: Array.from(preferenceSet),
    basicInfoFields: dedupeByKey(
      results.flatMap((result) => result.basicInfoFields),
      (field) => `${field.normalizedKey ?? field.label}::${field.value}::${field.sourceText}`,
    ),
    records: dedupeByKey(
      results.flatMap((result) => result.records),
      (record) => `${record.semanticType}::${record.label}::${record.value}::${record.sourceText}`,
    ),
    noteLine: rawText,
    rawText,
  };
}

export function parseSupplementInputBatch(text: string): SemanticExtractionResult {
  const normalized = text.trim();
  if (!normalized) {
    return parseSupplementInput('');
  }

  const segments = splitSupplementSegments(normalized);
  if (segments.length <= 1) {
    return parseSupplementInput(normalized);
  }

  return mergeSemanticExtractionResults(
    segments.map((segment) => parseSupplementInput(segment)),
    normalized,
  );
}
