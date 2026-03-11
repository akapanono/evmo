<template>
  <section class="app-screen is-active">
    <div class="topbar">
      <div>
        <p class="eyebrow">设置</p>
        <h1>AI 与数据管理</h1>
      </div>
    </div>

    <article class="profile-panel">
      <Avatar size="xxl" color="ink">设</Avatar>
      <div>
        <h2>当前本地工作区</h2>
        <p>{{ statsSummary }}</p>
      </div>
    </article>

    <section class="section-block">
      <div class="section-head">
        <h3>AI 设置</h3>
      </div>

      <article class="form-card">
        <div :class="['connection-status', connectionSummary.configured ? 'connected' : 'disconnected']">
          <strong>{{ connectionSummary.configured ? '已配置 AI 接入' : '尚未配置 AI 接入' }}</strong>
          <span>{{ summaryLine }}</span>
        </div>

        <div class="field-grid">
          <label class="field">
            <span>接入方式</span>
            <select v-model="accessMode" class="model-select">
              <option value="direct">前端直连</option>
              <option value="proxy">代理服务</option>
            </select>
          </label>

          <label class="field">
            <span>API Key</span>
            <input v-model="apiKey" type="password" placeholder="填写你的服务 API Key" />
            <p v-if="accessMode === 'direct'" class="field-hint warning">前端直连仅适合测试，密钥会保存在本地。</p>
          </label>

          <label class="field">
            <span>Base URL</span>
            <input v-model="baseUrl" type="text" placeholder="例如：https://ark.cn-beijing.volces.com/api/v3" />
          </label>

          <label class="field">
            <span>模型名</span>
            <input v-model="model" type="text" placeholder="例如：gpt-4o-mini / doubao-1-5-pro" />
          </label>

          <template v-if="accessMode === 'proxy'">
            <label class="field">
              <span>代理地址</span>
              <input v-model="proxyServerUrl" type="text" placeholder="http://localhost:8787" />
            </label>

            <label class="field">
              <span>中转站标识</span>
              <input v-model="proxyProviderId" type="text" placeholder="可留空" />
            </label>
          </template>

          <label class="field">
            <span>回答风格</span>
            <select v-model="aiStyle" class="model-select">
              <option value="friendly">亲切友好</option>
              <option value="professional">专业周到</option>
              <option value="concise">简洁直接</option>
            </select>
          </label>
        </div>

        <div class="section-actions-row">
          <button type="button" class="action-btn" @click="resetAISettings">重置 AI 设置</button>
          <button type="button" class="action-btn" @click="testConnection" :disabled="testing || !canTestConnection">
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <button type="button" class="action-btn primary" @click="saveAISettings">保存</button>
        </div>

        <p v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">{{ testResult.message }}</p>
      </article>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h3>数据管理</h3>
      </div>

      <article class="form-card data-card">
        <div class="data-summary">
          <div>
            <strong>{{ friendsStore.friends.length }}</strong>
            <span>朋友档案</span>
          </div>
          <div>
            <strong>{{ memorialDaysStore.memorialDays.length }}</strong>
            <span>纪念日</span>
          </div>
        </div>

        <div class="section-actions-row">
          <button type="button" class="action-btn" @click="triggerImport">导入数据</button>
          <button type="button" class="action-btn" @click="exportData">导出数据</button>
        </div>

        <input ref="fileInput" class="hidden-input" type="file" accept="application/json" @change="handleImport" />
        <p v-if="dataMessage" class="success-message">{{ dataMessage }}</p>
        <p v-if="dataError" class="error-message">{{ dataError }}</p>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Avatar from '@/components/common/Avatar.vue';
import { aiService } from '@/services/aiService';
import { getDB } from '@/database';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import { useSettingsStore } from '@/stores/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { Friend } from '@/types/friend';
import type { MemorialDay } from '@/types/memorial';

const settingsStore = useSettingsStore();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();

const DEFAULT_AI_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_AI_MODEL = 'ep-20260309112425-mwdsp';
const accessMode = ref<'direct' | 'proxy'>('direct');
const apiKey = ref('');
const baseUrl = ref(DEFAULT_AI_BASE_URL);
const proxyServerUrl = ref('http://localhost:8787');
const proxyProviderId = ref('');
const model = ref(DEFAULT_AI_MODEL);
const aiStyle = ref<'friendly' | 'professional' | 'concise'>('friendly');
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const dataMessage = ref('');
const dataError = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const connectionSummary = computed(() => {
  const settings = settingsStore.settings;
  const modelName = settings.openaiModel?.trim() || DEFAULT_AI_MODEL;
  const directBaseUrl = settings.openaiBaseUrl?.trim() || DEFAULT_AI_BASE_URL;
  const proxyBase = settings.proxyServerUrl?.trim() || 'http://localhost:8787';

  return {
    configured: settings.aiAccessMode === 'proxy'
      ? Boolean(proxyBase && directBaseUrl && settings.openaiApiKey && modelName)
      : Boolean(settings.openaiApiKey),
    mode: settings.aiAccessMode,
    baseUrl: settings.aiAccessMode === 'proxy' ? proxyBase : directBaseUrl,
    model: modelName,
    providerId: settings.proxyProviderId,
  };
});

const summaryLine = computed(() => {
  if (connectionSummary.value.mode === 'proxy') {
    const provider = connectionSummary.value.providerId?.trim() || '前端填写配置';
    return `${connectionSummary.value.baseUrl} · ${provider} · ${connectionSummary.value.model}`;
  }
  return `${connectionSummary.value.baseUrl} · ${connectionSummary.value.model}`;
});

const statsSummary = computed(() => `当前已保存 ${friendsStore.friends.length} 位朋友、${memorialDaysStore.memorialDays.length} 个纪念日。`);

const canTestConnection = computed(() => {
  if (!apiKey.value.trim() || !baseUrl.value.trim() || !model.value.trim()) {
    return false;
  }

  if (accessMode.value === 'proxy') {
    return Boolean(proxyServerUrl.value.trim());
  }

  return true;
});

onMounted(async () => {
  await Promise.all([
    friendsStore.loadFriends(),
    memorialDaysStore.loadMemorialDays(),
  ]);
  loadAISettings();
});

function loadAISettings(): void {
  accessMode.value = settingsStore.settings.aiAccessMode;
  apiKey.value = settingsStore.settings.openaiApiKey || '';
  baseUrl.value = settingsStore.settings.openaiBaseUrl || DEFAULT_AI_BASE_URL;
  proxyServerUrl.value = settingsStore.settings.proxyServerUrl || 'http://localhost:8787';
  proxyProviderId.value = settingsStore.settings.proxyProviderId || '';
  model.value = settingsStore.settings.openaiModel || DEFAULT_AI_MODEL;
  aiStyle.value = settingsStore.settings.aiStyle;
}

function resetMessages(): void {
  dataError.value = '';
  dataMessage.value = '';
}

function saveAISettings(): void {
  testResult.value = null;
  settingsStore.updateSettings({
    aiAccessMode: accessMode.value,
    openaiApiKey: apiKey.value || undefined,
    openaiBaseUrl: baseUrl.value.trim() || undefined,
    openaiModel: model.value.trim() || DEFAULT_AI_MODEL,
    proxyServerUrl: proxyServerUrl.value.trim() || undefined,
    proxyProviderId: proxyProviderId.value.trim() || undefined,
    aiStyle: aiStyle.value,
  });
}

function resetAISettings(): void {
  testResult.value = null;
  settingsStore.updateSettings({
    aiAccessMode: DEFAULT_SETTINGS.aiAccessMode,
    openaiApiKey: DEFAULT_SETTINGS.openaiApiKey,
    openaiBaseUrl: DEFAULT_SETTINGS.openaiBaseUrl,
    openaiModel: DEFAULT_SETTINGS.openaiModel,
    proxyServerUrl: DEFAULT_SETTINGS.proxyServerUrl,
    proxyProviderId: DEFAULT_SETTINGS.proxyProviderId,
    aiStyle: DEFAULT_SETTINGS.aiStyle,
  });
  loadAISettings();
}

async function testConnection(): Promise<void> {
  testing.value = true;
  testResult.value = null;

  try {
    saveAISettings();
    testResult.value = accessMode.value === 'proxy'
      ? await aiService.testProxyConnection()
      : await aiService.testAPIKey(apiKey.value, model.value, baseUrl.value);
  } catch (err) {
    testResult.value = { success: false, message: `测试失败：${(err as Error).message}` };
  } finally {
    testing.value = false;
  }
}

function triggerImport(): void {
  resetMessages();
  fileInput.value?.click();
}

async function exportData(): Promise<void> {
  resetMessages();

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    friends: friendsStore.friends,
    memorialDays: memorialDaysStore.memorialDays,
    settings: settingsStore.settings,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `evmo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  dataMessage.value = '数据已导出。';
}

async function handleImport(event: Event): Promise<void> {
  resetMessages();
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    const raw = JSON.parse(await file.text()) as {
      friends?: Friend[];
      memorialDays?: MemorialDay[];
      settings?: typeof settingsStore.settings;
    };
    const db = await getDB();
    const tx = db.transaction(['friends', 'memorialDays'], 'readwrite');
    await tx.objectStore('friends').clear();
    for (const friend of raw.friends ?? []) {
      await tx.objectStore('friends').put(friend);
    }
    await tx.objectStore('memorialDays').clear();
    for (const item of raw.memorialDays ?? []) {
      await tx.objectStore('memorialDays').put(item);
    }
    await tx.done;

    if (raw.settings) {
      settingsStore.updateSettings(raw.settings);
    }

    await Promise.all([
      friendsStore.loadFriends(),
      memorialDaysStore.loadMemorialDays(),
    ]);
    loadAISettings();
    dataMessage.value = '数据已导入。';
  } catch (err) {
    dataError.value = `导入失败：${(err as Error).message}`;
  } finally {
    input.value = '';
  }
}

</script>

<style scoped>
.model-select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px;
  background: #fff;
  color: var(--ink);
  font: inherit;
}

.field-hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
  line-height: 1.4;
}

.field-hint.warning {
  color: var(--coral);
  background: rgba(255, 107, 107, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 8px;
}

.connection-status {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 16px;
  margin-bottom: 14px;
}

.connection-status.connected {
  background: rgba(47, 138, 130, 0.1);
  color: #2f8a82;
}

.connection-status.disconnected {
  background: rgba(255, 107, 107, 0.1);
  color: var(--coral);
}

.connection-status span {
  font-size: 12px;
}

.section-actions-row {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.data-card {
  display: grid;
  gap: 14px;
}

.data-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.data-summary > div {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px;
  display: grid;
  gap: 6px;
}

.data-summary strong {
  font-size: 24px;
}

.data-summary span {
  color: var(--muted);
}

.hidden-input {
  display: none;
}

.test-result {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.test-result.success {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.test-result.error {
  background: rgba(255, 107, 107, 0.1);
  color: var(--coral);
}

@media (max-width: 520px) {
  .section-actions-row,
  .data-summary {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
