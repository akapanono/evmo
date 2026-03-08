import type { SemanticType, TemporalScope } from '@/types/friend';
import type { SemanticExtractionRecord, SemanticExtractionResult } from '@/types/extraction';

const EXPLICIT_TIME_PATTERN = /今天|明天|后天|今晚|明早|明晚|下周|这周|本周|月底|月初|月中|下个月|近期|即将|周[一二三四五六日天]/;
const FUZZY_TIME_PATTERN = /最近|马上|过阵子|这阵子|这段时间|近来|近期|短期|中期|长期|之后|随后|稍后|尽快|改天|回头|未来一段时间/;
const STATUS_PATTERN = /在忙|准备|打算|计划|正在|考研|考试|出差|搬家|住院|工作变动|实习|入职|离职|装修|旅行|备婚|求职/;
const TIMEBOUND_PATTERN = /最近|这周|本周|今天|明天|后天|今晚|明早|明晚|下周|月底|月初|月中|下个月|近期|现在|正在|在忙|准备|打算|计划|要|即将|马上|报名|考研|考试|出差|搬家|住院|工作变动|中期|长期|短期|未来一段时间|稍后|随后|尽快|过阵子|这段时间|近来/;
const PREFERENCE_PATTERN = /不吃|不喜欢|讨厌|禁忌|忌口|雷区|喜欢|爱吃|偏好|爱好|想要/;

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

function extractPreference(text: string): string | undefined {
  const patterns: Array<{ pattern: RegExp; formatter: (value: string) => string }> = [
    {
      pattern: /不喜欢([^，。；,]+)/,
      formatter: (value) => `不喜欢${value}`,
    },
    {
      pattern: /讨厌([^，。；,]+)/,
      formatter: (value) => `不喜欢${value}`,
    },
    {
      pattern: /不吃([^，。；,]+)/,
      formatter: (value) => `不吃${value}`,
    },
    {
      pattern: /禁忌([^，。；,]+)/,
      formatter: (value) => `禁忌${value}`,
    },
    {
      pattern: /忌口([^，。；,]+)/,
      formatter: (value) => `忌口${value}`,
    },
    {
      pattern: /雷区([^，。；,]+)/,
      formatter: (value) => `雷区${value}`,
    },
    {
      pattern: /喜欢([^，。；,]+)/,
      formatter: (value) => value,
    },
    {
      pattern: /爱吃([^，。；,]+)/,
      formatter: (value) => value,
    },
    {
      pattern: /偏好([^，。；,]+)/,
      formatter: (value) => value,
    },
    {
      pattern: /爱好([^，。；,]+)/,
      formatter: (value) => value,
    },
  ];

  for (const { pattern, formatter } of patterns) {
    const matched = text.match(pattern);
    if (!matched?.[1]) {
      continue;
    }

    const value = normalizePreferenceValue(matched[1]);
    if (!value) {
      continue;
    }

    return formatter(value);
  }

  return undefined;
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
  },
): SemanticExtractionRecord {
  return {
    label: '事件',
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

export function parseSupplementInput(text: string): SemanticExtractionResult {
  const normalized = text.trim();
  const birthday = extractBirthday(normalized);
  const preference = extractPreference(normalized);

  if (!normalized) {
    return {
      birthday: undefined,
      preferences: [],
      records: [],
      noteLine: '',
      rawText: '',
    };
  }

  if (birthday) {
    return {
      birthday,
      preferences: preference ? [preference] : [],
      records: [],
      noteLine: normalized,
      rawText: normalized,
    };
  }

  if (preference || PREFERENCE_PATTERN.test(normalized)) {
    return {
      birthday: undefined,
      preferences: preference ? [preference] : [],
      records: [],
      noteLine: normalized,
      rawText: normalized,
    };
  }

  return {
    birthday: undefined,
    preferences: [],
    records: [classifyRecord(normalized)],
    noteLine: normalized,
    rawText: normalized,
  };
}
