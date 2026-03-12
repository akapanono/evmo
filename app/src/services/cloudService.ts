import { getDB } from '@/database';
import { storageService } from '@/services/storageService';
import type { AuthSession, AuthUser } from '@/types/auth';
import type { Friend } from '@/types/friend';
import type { MemorialDay } from '@/types/memorial';
import type { AppSettings } from '@/types/settings';

interface CloudBackupPayload {
  friends: Friend[];
  memorialDays: MemorialDay[];
  settings: AppSettings;
}

function getServerBaseUrl(): string {
  const baseUrl = storageService.getSettings().proxyServerUrl?.trim();
  if (!baseUrl) {
    throw new Error('请先配置后端服务地址。');
  }

  return baseUrl.replace(/\/+$/, '');
}

function getAuthHeaders(): Record<string, string> {
  const session = storageService.getAuthSession();
  if (!session?.token) {
    throw new Error('请先登录。');
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
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
    throw new Error(payload?.error || '请求失败。');
  }

  return payload.data as T;
}

async function collectLocalBackupPayload(): Promise<CloudBackupPayload> {
  const db = await getDB();
  const [friends, memorialDays] = await Promise.all([
    db.getAll('friends'),
    db.getAll('memorialDays'),
  ]);

  return {
    friends,
    memorialDays,
    settings: storageService.getSettings(),
  };
}

async function replaceLocalBackupPayload(payload: Partial<CloudBackupPayload>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['friends', 'memorialDays'], 'readwrite');

  await tx.objectStore('friends').clear();
  for (const friend of payload.friends ?? []) {
    await tx.objectStore('friends').put(friend);
  }

  await tx.objectStore('memorialDays').clear();
  for (const item of payload.memorialDays ?? []) {
    await tx.objectStore('memorialDays').put(item);
  }

  await tx.done;

  if (payload.settings) {
    storageService.saveSettings(payload.settings);
  }
}

export const cloudService = {
  async register(input: { name?: string; phone: string; password: string }): Promise<AuthSession> {
    return requestJson<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async login(input: { phone: string; password: string }): Promise<AuthSession> {
    return requestJson<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getCurrentUser(): Promise<AuthUser> {
    return requestJson<AuthUser>('/api/auth/me', {
      headers: getAuthHeaders(),
    });
  },

  async backupToCloud(): Promise<{ savedAt: string }> {
    const payload = await collectLocalBackupPayload();
    return requestJson<{ savedAt: string }>('/api/backup/push', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  async restoreFromCloud(): Promise<{ restoredAt: string; settings?: AppSettings }> {
    const payload = await requestJson<CloudBackupPayload & { restoredAt: string }>('/api/backup/pull', {
      headers: getAuthHeaders(),
    });

    await replaceLocalBackupPayload(payload);
    return {
      restoredAt: payload.restoredAt,
      settings: payload.settings,
    };
  },
};
