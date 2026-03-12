export interface RecommendationScore {
  key: string;
  label: string;
  score: number;
  matchedSignals: string[];
}

export interface GiftSuggestionItem {
  id: string;
  title: string;
  priceLabel: string;
  link: string;
  reason: string;
}

export interface GiftSuggestionBucket {
  key: 'under50' | '50to100' | '100to300' | '300to1000' | '1000plus';
  label: string;
  items: GiftSuggestionItem[];
}

export interface OccasionRecommendation {
  gifts: string[];
  scoreCards: RecommendationScore[];
  updatedAt: string;
  source: 'system';
}
