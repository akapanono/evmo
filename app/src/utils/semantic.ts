import type { SemanticType, TemporalScope } from '@/types/friend';
import type { BasicInfoExtractionField, SemanticExtractionRecord, SemanticExtractionResult } from '@/types/extraction';

const TIMEBOUND_PATTERN = /今天|明天|后天|大后天|昨天|前天|最近|近期|这几天|过几天|本周|这周|本星期|这星期|下周|下星期|下下周|下下星期|上周|上星期|上上周|上上星期|\d{1,2}天后|\d{1,2}天前|\d{1,2}周后|\d{1,2}周前|本月|这个月|下个月|下下个月|上个月|上上个月|本月底|这个月底|本月初|这个月初|下月底|下月初|\d{1,2}个月后|\d{1,2}月\d{1,2}[日号]?|\d{1,2}-\d{1,2}|(?:周|星期)[一二三四五六日天]|第[一二三四五]个(?:周|星期)[一二三四五六日天]|准备|安排|要去|要做|出差|考试|聚餐|酒席|开会|见面|旅行|旅游|复查|复诊|搬家|约会|演出|婚礼/;
const SENTENCE_SEPARATOR_PATTERN = /[\r\n]+|[。！？!?\uFF1B;]+/;
const PREFERENCE_VALUE_SEPARATOR_PATTERN = /[、,，/]|(?:和|及|以及|还有)/;

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
  if (!/生日/.test(text)) {
    return undefined;
  }

  const chineseMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  if (chineseMatch?.[1] && chineseMatch[2]) {
    return toBirthday(chineseMatch[1], chineseMatch[2]);
  }

  const dashMatch = text.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if (dashMatch?.[1] && dashMatch[2]) {
    return toBirthday(dashMatch[1], dashMatch[2]);
  }

  return undefined;
}

function normalizePreferenceValue(value: string): string {
  return value
    .trim()
    .replace(/^(喜欢|爱吃|爱喝|爱玩|偏好|口味|不吃|不喝|忌口|讨厌|不喜欢)/, '')
    .replace(/^(吃|喝|玩)/, '')
    .trim();
}

function splitPreferenceValues(value: string): string[] {
  const normalized = normalizePreferenceValue(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(PREFERENCE_VALUE_SEPARATOR_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function extractPreferences(text: string): string[] {
  const results: string[] = [];
  const rules = [
    /喜欢吃(.+)/g,
    /喜欢喝(.+)/g,
    /喜欢玩(.+)/g,
    /爱吃(.+)/g,
    /爱喝(.+)/g,
    /爱玩(.+)/g,
    /不喜欢(.+)/g,
    /讨厌(.+)/g,
    /忌口(.+)/g,
  ];

  for (const rule of rules) {
    for (const matched of text.matchAll(rule)) {
      if (matched[1]) {
        results.push(...splitPreferenceValues(matched[1]));
      }
    }
  }

  return uniqueStrings(results);
}

function extractBasicInfo(text: string): BasicInfoExtractionField[] {
  const rules: Array<{ pattern: RegExp; label: string; normalizedKey: string }> = [
    { pattern: /性别[是为:]?\s*(男|女|女生|男生|非二元)/, label: '性别', normalizedKey: 'gender' },
    { pattern: /今年?(\d{1,3})岁/, label: '年龄', normalizedKey: 'age' },
    { pattern: /身高[是为:]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:cm|厘米)?/i, label: '身高', normalizedKey: 'heightCm' },
    { pattern: /体重[是为:]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:kg|公斤|千克)?/i, label: '体重', normalizedKey: 'weightKg' },
    { pattern: /在(.{2,20}?)(?:工作|上班|生活)/, label: '所在城市', normalizedKey: 'city' },
    { pattern: /家乡[是为:]?\s*(.{2,20})/, label: '家乡', normalizedKey: 'hometown' },
    { pattern: /职业[是为:]?\s*(.{2,20})/, label: '职业', normalizedKey: 'occupation' },
    { pattern: /公司[是为:]?\s*(.{2,30})/, label: '公司', normalizedKey: 'company' },
    { pattern: /学校[是为:]?\s*(.{2,30})/, label: '学校', normalizedKey: 'school' },
    { pattern: /专业[是为:]?\s*(.{2,30})/, label: '专业', normalizedKey: 'major' },
  ];

  const results: BasicInfoExtractionField[] = [];
  for (const rule of rules) {
    const matched = text.match(rule.pattern);
    if (!matched?.[1]) {
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

  return dedupeByKey(results, (field) => `${field.normalizedKey ?? field.label}::${field.value}`);
}

function extractEventTimeText(text: string): string | undefined {
  const patterns = [
    /今天|明天|后天|大后天|昨天|前天/,
    /本周|这周|本星期|这星期|下周|下星期|下下周|下下星期|上周|上星期|上上周|上上星期(?:[一二三四五六日天])?/,
    /(?:周|星期)[一二三四五六日天]/,
    /本月|这个月|下个月|下下个月|上个月|上上个月|本月底|这个月底|本月初|这个月初|下月底|下月初/,
    /\d{1,2}天后|\d{1,2}天前|\d{1,2}周后|\d{1,2}周前|\d{1,2}个月后/,
    /\d{1,2}月\d{1,2}[日号]?|\d{1,2}-\d{1,2}/,
    /第[一二三四五]个(?:周|星期)[一二三四五六日天]/,
  ];

  for (const pattern of patterns) {
    const matched = text.match(pattern);
    if (matched?.[0]) {
      return matched[0];
    }
  }

  return undefined;
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
  const timebound = TIMEBOUND_PATTERN.test(text);

  return buildRecord(text, {
    semanticType: timebound ? 'event' : 'note',
    temporalScope: timebound ? 'timebound' : 'stable',
    includeInTimeline: timebound,
    eventTimeText: timebound ? eventTimeText : undefined,
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

export function isLikelyTimeboundText(text: string): boolean {
  return TIMEBOUND_PATTERN.test(text.trim());
}

export function buildTimeboundRecord(text: string): SemanticExtractionRecord | null {
  const normalized = text.trim();
  if (!normalized || !isLikelyTimeboundText(normalized)) {
    return null;
  }

  const record = classifyRecord(normalized);
  return record.includeInTimeline ? record : null;
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
  const inferredRecord = classifyRecord(normalized);
  const shouldCreateRecord = inferredRecord.includeInTimeline || (!birthday && preferences.length === 0 && basicInfoFields.length === 0);

  return {
    birthday,
    preferences,
    basicInfoFields,
    records: shouldCreateRecord ? [inferredRecord] : [],
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
