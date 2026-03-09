interface RuntimeContextSnapshot {
  collectedAt: string;
  publicIp?: string;
}

export interface RuntimePromptContext {
  promptText: string;
  collectedAt: string;
}

const RUNTIME_CACHE_KEY = 'evmo-runtime-context';
const CACHE_TTL_MS = 30 * 60 * 1000;
const IP_TIMEOUT_MS = 1200;

function readCache(): RuntimeContextSnapshot | null {
  const raw = localStorage.getItem(RUNTIME_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RuntimeContextSnapshot;
    if (!parsed.collectedAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(snapshot: RuntimeContextSnapshot): void {
  localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(snapshot));
}

async function fetchPublicIp(): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), IP_TIMEOUT_MS);

  try {
    const response = await fetch('https://api64.ipify.org?format=json', {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = await response.json() as { ip?: string };
    const ip = payload.ip?.trim();
    return ip || undefined;
  } catch {
    return undefined;
  } finally {
    window.clearTimeout(timer);
  }
}

function getCurrentDateMeta(now: Date) {
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', {
    weekday: 'long',
  });

  return {
    dateText: dateFormatter.format(now).replace(/\//g, '-'),
    timeText: timeFormatter.format(now),
    weekdayText: weekdayFormatter.format(now),
  };
}

export const runtimeContextService = {
  async getSnapshot(): Promise<RuntimeContextSnapshot> {
    const cached = readCache();
    const now = Date.now();

    if (cached && now - new Date(cached.collectedAt).getTime() < CACHE_TTL_MS) {
      return cached;
    }

    const snapshot: RuntimeContextSnapshot = {
      collectedAt: new Date(now).toISOString(),
      publicIp: await fetchPublicIp(),
    };
    writeCache(snapshot);
    return snapshot;
  },

  async buildPromptContext(forceRefresh = false): Promise<RuntimePromptContext> {
    const now = new Date();
    const { dateText, timeText, weekdayText } = getCurrentDateMeta(now);
    const snapshot = forceRefresh
      ? {
        collectedAt: now.toISOString(),
        publicIp: await fetchPublicIp(),
      }
      : await this.getSnapshot();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const navigatorWithExtras = navigator as Navigator & {
      userAgentData?: { platform?: string };
      connection?: { effectiveType?: string };
      deviceMemory?: number;
    };
    const language = navigator.language || 'zh-CN';
    const platform = navigatorWithExtras.userAgentData?.platform || navigator.platform || 'unknown';
    const online = navigator.onLine ? '在线' : '离线';
    const network = navigatorWithExtras.connection?.effectiveType || 'unknown';
    const deviceMemory = typeof navigatorWithExtras.deviceMemory === 'number'
      ? `${navigatorWithExtras.deviceMemory}GB`
      : undefined;

    const lines = [
      `当前日期: ${dateText}`,
      `当前时间: ${timeText}`,
      `星期: ${weekdayText}`,
      `时区: ${timezone}`,
      `界面语言: ${language}`,
      `设备平台: ${platform}`,
      `网络状态: ${online}`,
      `网络类型: ${network}`,
    ];

    if (deviceMemory) {
      lines.push(`设备内存信息: ${deviceMemory}`);
    }

    if (snapshot.publicIp) {
      lines.push(`当前公网 IP: ${snapshot.publicIp}`);
    }

    return {
      promptText: lines.join('\n'),
      collectedAt: snapshot.collectedAt,
    };
  },
};
