import { storageService } from '@/services/storageService';
import type { Friend } from '@/types/friend';
import type { MemorialDay } from '@/types/memorial';
import type { OccasionRecommendation } from '@/types/recommendation';

function getServerBaseUrl(): string {
  const baseUrl = storageService.getSettings().proxyServerUrl?.trim();
  if (!baseUrl) {
    throw new Error('未配置后端服务地址。');
  }

  return baseUrl.replace(/\/+$/, '');
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getServerBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || '请求失败');
  }

  return payload.data as T;
}

export const recommendationService = {
  async buildBirthdayRecommendation(friend: Friend): Promise<OccasionRecommendation> {
    return requestJson<OccasionRecommendation>('/api/recommendations/occasion', {
      method: 'POST',
      body: JSON.stringify({
        friend,
        previewGiftLimit: 3,
      }),
    });
  },

  async buildMemorialRecommendation(memorial: MemorialDay, linkedFriends: Friend[]): Promise<OccasionRecommendation> {
    return requestJson<OccasionRecommendation>('/api/recommendations/occasion', {
      method: 'POST',
      body: JSON.stringify({
        memorial,
        friend: linkedFriends[0] ?? {},
        linkedFriends,
        previewGiftLimit: 3,
      }),
    });
  },
};
