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

function extractPreference(text: string): string | undefined {
  const patterns = [
    /喜欢([^，。；,]+)/,
    /爱吃([^，。；,]+)/,
    /不喜欢([^，。；,]+)/,
    /不吃([^，。；,]+)/,
    /讨厌([^，。；,]+)/,
  ];

  for (const pattern of patterns) {
    const matched = text.match(pattern);
    if (matched?.[1]) {
      const prefix = matched[0].startsWith('不') || matched[0].startsWith('讨厌') ? '不' : '喜欢';
      const value = matched[1].trim();
      return prefix === '不' ? `不${value}` : value;
    }
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
