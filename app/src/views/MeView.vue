<template>
  <section class="app-screen is-active">
    <div class="topbar">
      <div>
        <p class="eyebrow">我的</p>
        <h1>账号与设置</h1>
      </div>
    </div>

    <article class="profile-panel">
      <Avatar size="xxl" color="ink">我</Avatar>
      <div>
        <h2>你的账号</h2>
        <p>用于管理生日提醒、隐私设置和 AI 使用偏好。</p>
      </div>
    </article>

    <div class="settings-list">
      <article>
        <strong>账号信息</strong>
        <span>手机号、昵称、登录设备</span>
      </article>
      <article>
        <strong>提醒设置</strong>
        <span>生日提醒、重要事件提醒</span>
      </article>
      <article>
        <strong>隐私与安全</strong>
        <span>锁屏隐藏、敏感信息展示、数据保护</span>
      </article>
      <article @click="openSection('ai')">
        <strong>AI 设置</strong>
        <span>{{ connectionText }}</span>
      </article>
    </div>

    <section v-if="showAISettings" class="section-block">
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
            <p class="field-hint">测试豆包或其他兼容服务时，两种方式都支持直接填写地址、API Key 和模型。</p>
          </label>

          <label class="field">
            <span>API Key</span>
            <input v-model="apiKey" type="password" placeholder="填你的服务 API Key" />
            <p class="field-hint warning" v-if="accessMode === 'direct'">当前为前端直连模式，API Key 保存在浏览器本地，只适合测试。</p>
            <p class="field-hint" v-else>代理模式下，如果不填中转站标识，就会直接使用这里填写的 API Key 转发。</p>
          </label>

          <label class="field">
            <span>Base URL</span>
            <input v-model="baseUrl" type="text" placeholder="例如：https://ark.cn-beijing.volces.com/api/v3" />
            <p class="field-hint">填写 OpenAI 兼容地址即可，豆包和多数中转站都可这样接。</p>
          </label>

          <label class="field">
            <span>模型名</span>
            <input v-model="model" type="text" placeholder="例如：doubao-1-5-pro-32k-250115" list="model-suggestions" />
            <datalist id="model-suggestions">
              <option value="gpt-4o-mini"></option>
              <option value="gpt-4o"></option>
              <option value="doubao-1-5-pro-32k-250115"></option>
              <option value="doubao-1-5-lite-32k-250115"></option>
              <option value="claude-3-5-sonnet"></option>
              <option value="gemini-2.0-flash"></option>
            </datalist>
          </label>

          <template v-if="accessMode === 'proxy'">
            <label class="field">
              <span>代理地址</span>
              <input v-model="proxyServerUrl" type="text" placeholder="http://localhost:8787" />
              <p class="field-hint">本地代理默认监听 `http://localhost:8787`。</p>
            </label>

            <label class="field">
              <span>中转站标识</span>
              <input v-model="proxyProviderId" type="text" placeholder="可留空；留空则直接使用上面的 API Key 和 Base URL" />
              <p class="field-hint">只有在你想使用服务端预置配置时才填写。</p>
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

        <div class="ai-actions">
          <button type="button" class="action-btn" @click="showAISettings = false">取消</button>
          <button type="button" class="action-btn" @click="testConnection" :disabled="testing || !canTestConnection">
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <button type="button" class="action-btn primary" @click="saveAISettings">保存</button>
        </div>

        <p v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">{{ testResult.message }}</p>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Avatar from '@/components/common/Avatar.vue';
import { aiService } from '@/services/aiService';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

const showAISettings = ref(false);
const accessMode = ref<'direct' | 'proxy'>('direct');
const apiKey = ref('');
const baseUrl = ref('https://api.openai.com/v1');
const proxyServerUrl = ref('http://localhost:8787');
const proxyProviderId = ref('');
const model = ref('gpt-4o-mini');
const aiStyle = ref<'friendly' | 'professional' | 'concise'>('friendly');
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const connectionSummary = computed(() => aiService.getConnectionSummary());
const summaryLine = computed(() => {
  if (connectionSummary.value.mode === 'proxy') {
    const provider = connectionSummary.value.providerId?.trim() || '前端填写配置';
    return `${connectionSummary.value.baseUrl || '未配置代理地址'} · ${provider} · ${connectionSummary.value.model}`;
  }
  return `${connectionSummary.value.baseUrl || '未配置地址'} · ${connectionSummary.value.model}`;
});
const connectionText = computed(() => {
  if (connectionSummary.value.mode === 'proxy') {
    return connectionSummary.value.providerId?.trim() ? '代理服务 / 预置中转站' : '代理服务 / 前端填写';
  }
  return connectionSummary.value.configured ? `${connectionSummary.value.model} · 已配置` : '未配置 API Key';
});
const canTestConnection = computed(() => {
  if (!apiKey.value.trim() || !baseUrl.value.trim() || !model.value.trim()) {
    return false;
  }

  if (accessMode.value === 'proxy') {
    return Boolean(proxyServerUrl.value.trim());
  }

  return true;
});

onMounted(() => {
  accessMode.value = settingsStore.settings.aiAccessMode;
  apiKey.value = settingsStore.settings.openaiApiKey || '';
  baseUrl.value = settingsStore.settings.openaiBaseUrl || 'https://api.openai.com/v1';
  proxyServerUrl.value = settingsStore.settings.proxyServerUrl || 'http://localhost:8787';
  proxyProviderId.value = settingsStore.settings.proxyProviderId || '';
  model.value = settingsStore.settings.openaiModel;
  aiStyle.value = settingsStore.settings.aiStyle;
});

function openSection(section: string): void {
  if (section !== 'ai') return;

  showAISettings.value = true;
  accessMode.value = settingsStore.settings.aiAccessMode;
  apiKey.value = settingsStore.settings.openaiApiKey || '';
  baseUrl.value = settingsStore.settings.openaiBaseUrl || 'https://api.openai.com/v1';
  proxyServerUrl.value = settingsStore.settings.proxyServerUrl || 'http://localhost:8787';
  proxyProviderId.value = settingsStore.settings.proxyProviderId || '';
  model.value = settingsStore.settings.openaiModel;
  aiStyle.value = settingsStore.settings.aiStyle;
  testResult.value = null;
}

async function testConnection(): Promise<void> {
  testing.value = true;
  testResult.value = null;

  try {
    settingsStore.updateSettings({
      aiAccessMode: accessMode.value,
      openaiApiKey: apiKey.value || undefined,
      openaiBaseUrl: baseUrl.value.trim() || undefined,
      openaiModel: model.value.trim() || 'gpt-4o-mini',
      proxyServerUrl: proxyServerUrl.value.trim() || undefined,
      proxyProviderId: proxyProviderId.value.trim() || undefined,
    });

    testResult.value = accessMode.value === 'proxy'
      ? await aiService.testProxyConnection()
      : await aiService.testAPIKey(apiKey.value, model.value, baseUrl.value);
  } catch (err) {
    testResult.value = { success: false, message: `测试失败：${(err as Error).message}` };
  } finally {
    testing.value = false;
  }
}

function saveAISettings(): void {
  settingsStore.updateSettings({
    aiAccessMode: accessMode.value,
    openaiApiKey: apiKey.value || undefined,
    openaiBaseUrl: baseUrl.value.trim() || undefined,
    openaiModel: model.value.trim() || 'gpt-4o-mini',
    proxyServerUrl: proxyServerUrl.value.trim() || undefined,
    proxyProviderId: proxyProviderId.value.trim() || undefined,
    aiStyle: aiStyle.value,
  });
  showAISettings.value = false;
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

.ai-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
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
</style>
