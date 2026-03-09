import type { ExtractionMethod, SemanticType, TemporalScope } from '@/types/friend';

export interface BasicInfoExtractionField {
  label: string;
  value: string;
  sourceText: string;
  normalizedKey?: string;
  confidence?: number;
}

export interface SemanticExtractionRecord {
  label: string;
  value: string;
  includeInTimeline: boolean;
  semanticType: SemanticType;
  temporalScope: TemporalScope;
  extractionMethod: ExtractionMethod;
  sourceText: string;
  eventTimeText?: string;
  normalizedValue?: string;
  confidence?: number;
}

export interface SemanticExtractionResult {
  birthday?: string;
  preferences: string[];
  basicInfoFields: BasicInfoExtractionField[];
  records: SemanticExtractionRecord[];
  noteLine: string;
  rawText: string;
}

export interface LlmExtractionPayload extends SemanticExtractionResult {
  model?: string;
}
