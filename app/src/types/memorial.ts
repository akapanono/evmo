import type { OccasionRecommendation } from '@/types/recommendation';

export interface MemorialDay {
  id: string;
  name: string;
  monthDay: string;
  friendIds: string[];
  note?: string;
  recommendation?: OccasionRecommendation;
  createdAt: string;
  updatedAt: string;
}
