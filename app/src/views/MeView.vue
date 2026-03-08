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
        <h2>{{ settingsStore.settings.profileName || '你的账号' }}</h2>
        <p>用于管理生日提醒、隐私设置和 AI 使用偏好。</p>
      </div>
    </article>

    <div class="settings-list">
      <article @click="openSection('account')">
        <strong>账号信息</strong>
        <span>{{ accountSummary }}</span>
      </article>
      <article @click="openSection('reminder')">
        <strong>提醒设置</strong>
        <span>{{ reminderSummary }}</span>
      </article>
      <article @click="openSection('privacy')">
        <strong>隐私与安全</strong>
        <span>{{ privacySummary }}</span>
      </article>
      <article @click="openSection('ai')">
        <strong>AI 设置</strong>
        <span>{{ connectionText }}</span>
      </article>
    </div>

    <section v-if="activeSection === 'account'" class="section-block">
      <div class="section-head">
        <h3>账号信息</h3>
      </div>

      <article class="form-card">
        <div class="field-grid">
          <label class="field">
            <span>显示名称</span>
            <input v-model="profileName" type="text" placeholder="例如：我的账号" />
          </label>

          <label class="field">
            <span>手机号</span>
            <input v-model="profilePhone" type="text" placeholder="仅本地保存，例如：138****1234" />
            <p class="field-hint">这里只做本地记录，不接真实登录系统。</p>
          </label>

          <label class="field">
            <span>设备备注</span>
            <input v-model="profileDeviceName" type="text" placeholder="例如：Pixel 9 / iPhone 15" />
          </label>
        </div>

        <div class="section-actions-row">
          <button type="button" class="action-btn" @click="closeSection">取消</button>
          <button type="button" class="action-btn primary" @click="saveAccountSettings">保存</button>
        </div>
      </article>
    </section>

    <section v-if="activeSection === 'reminder'" class="section-block">
      <div class="section-head">
        <h3>提醒设置</h3>
      </div>

      <article class="form-card">
        <div class="toggle-row">
          <div>
            <strong>生日提醒</strong>
            <p>用于后续接入系统通知时作为默认规则。</p>
          </div>
          <label class="switch">
            <input v-model="birthdayReminderEnabled" type="checkbox" />
            <span></span>
          </label>
        </div>

        <div class="field-grid two-col">
          <label class="field">
            <span>提前天数</span>
            <select v-model.number="birthdayReminderDaysBefore" class="model-select">
              <option :value="0">当天</option>
              <option :value="1">提前 1 天</option>
              <option :value="3">提前 3 天</option>
              <option :value="7">提前 7 天</option>
            </select>
          </label>

          <label class="field">
            <span>提醒时间</span>
            <input v-model="birthdayReminderTime" type="time" />
          </label>
        </div>

        <div class="section-actions-row">
          <button type="button" class="action-btn" @click="closeSection">取消</button>
          <button type="button" class="action-btn primary" @click="saveReminderSettings">保存</button>
        </div>
      </article>
    </section>

    <section v-if="activeSection === 'privacy'" class="section-block">
      <div class="section-head">
        <h3>隐私与安全</h3>
      </div>

      <article class="form-card">
        <div class="toggle-row">
          <div>
            <strong>锁屏隐藏</strong>
            <p>后续接入手机端后，可作为锁屏或切后台时的隐藏策略。</p>
          </div>
          <label class="switch">
            <input v-model="lockScreen" type="checkbox" />
            <span></span>
          </label>
        </div>

        <div class="toggle-row compact-gap">
          <div>
            <strong>隐藏敏感信息</strong>
            <p>开启后，档案中的生日等信息可在后续版本做默认弱化显示。</p>
          </div>
          <label class="switch">
            <input v-model="hideSensitiveInfo" type="checkbox" />
            <span></span>
          </label>
        </div>

        <div class="section-actions-row">
          <button type="button" class="action-btn" @click="closeSection">取消</button>
          <button type="button" class="action-btn primary" @click="savePrivacySettings">保存</button>
        </div>
      </article>
    </section>

    <section v-if="activeSection === 'ai'" class="section-block">
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

        <div class="section-actions-row">
          <button type="button" class="action-btn" @click="closeSection">取消</button>
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

const activeSection = ref<'account' | 'reminder' | 'privacy' | 'ai' | null>(null);
const accessMode = ref<'direct' | 'proxy'>('direct');
const apiKey = ref('');
const baseUrl = ref('https://api.openai.com/v1');
const proxyServerUrl = ref('http://localhost:8787');
const proxyProviderId = ref('');
const model = ref('gpt-4o-mini');
const aiStyle = ref<'friendly' | 'professional' | 'concise'>('friendly');
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const profileName = ref('');
const profilePhone = ref('');
const profileDeviceName = ref('');
const birthdayReminderEnabled = ref(true);
const birthdayReminderDaysBefore = ref(1);
const birthdayReminderTime = ref('09:00');
const lockScreen = ref(false);
const hideSensitiveInfo = ref(false);

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
const accountSummary = computed(() => {
  const name = settingsStore.settings.profileName?.trim() || '未命名账号';
  const phone = settingsStore.settings.profilePhone?.trim() || '未填写手机号';
  return `${name} · ${phone}`;
});
const reminderSummary = computed(() => {
  const reminder = settingsStore.settings.birthdayReminder;
  if (!reminder.enabled) {
    return '生日提醒已关闭';
  }
  return `提前 ${reminder.daysBefore} 天 · ${reminder.time}`;
});
const privacySummary = computed(() => {
  const labels: string[] = [];
  if (settingsStore.settings.lockScreen) labels.push('锁屏隐藏');
  if (settingsStore.settings.hideSensitiveInfo) labels.push('隐藏敏感信息');
  return labels.length > 0 ? labels.join(' · ') : '当前为标准显示';
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
  loadAllSettings();
});

function loadAllSettings(): void {
  profileName.value = settingsStore.settings.profileName || '我的账号';
  profilePhone.value = settingsStore.settings.profilePhone || '';
  profileDeviceName.value = settingsStore.settings.profileDeviceName || '当前设备';
  birthdayReminderEnabled.value = settingsStore.settings.birthdayReminder.enabled;
  birthdayReminderDaysBefore.value = settingsStore.settings.birthdayReminder.daysBefore;
  birthdayReminderTime.value = settingsStore.settings.birthdayReminder.time;
  lockScreen.value = settingsStore.settings.lockScreen;
  hideSensitiveInfo.value = settingsStore.settings.hideSensitiveInfo;
  accessMode.value = settingsStore.settings.aiAccessMode;
  apiKey.value = settingsStore.settings.openaiApiKey || '';
  baseUrl.value = settingsStore.settings.openaiBaseUrl || 'https://api.openai.com/v1';
  proxyServerUrl.value = settingsStore.settings.proxyServerUrl || 'http://localhost:8787';
  proxyProviderId.value = settingsStore.settings.proxyProviderId || '';
  model.value = settingsStore.settings.openaiModel;
  aiStyle.value = settingsStore.settings.aiStyle;
}

function openSection(section: 'account' | 'reminder' | 'privacy' | 'ai'): void {
  activeSection.value = section;
  loadAllSettings();
  testResult.value = null;
}

function closeSection(): void {
  activeSection.value = null;
  testResult.value = null;
  loadAllSettings();
}

function saveAccountSettings(): void {
  settingsStore.updateSettings({
    profileName: profileName.value.trim() || '我的账号',
    profilePhone: profilePhone.value.trim(),
    profileDeviceName: profileDeviceName.value.trim() || '当前设备',
  });
  activeSection.value = null;
}

function saveReminderSettings(): void {
  settingsStore.updateSettings({
    birthdayReminder: {
      enabled: birthdayReminderEnabled.value,
      daysBefore: birthdayReminderDaysBefore.value,
      time: birthdayReminderTime.value || '09:00',
    },
  });
  activeSection.value = null;
}

function savePrivacySettings(): void {
  settingsStore.updateSettings({
    lockScreen: lockScreen.value,
    hideSensitiveInfo: hideSensitiveInfo.value,
  });
  activeSection.value = null;
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
  activeSection.value = null;
}
</script>

<style scoped>
.settings-list article {
  cursor: pointer;
}

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
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
}

.toggle-row p {
  margin: 6px 0 0;
  color: var(--muted);
  line-height: 1.5;
  font-size: 13px;
}

.compact-gap {
  border-top: 1px solid var(--line);
}

.switch {
  position: relative;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch span {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(29, 40, 49, 0.14);
  transition: background 0.2s ease;
}

.switch span::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.switch input:checked + span {
  background: var(--ink);
}

.switch input:checked + span::after {
  transform: translateX(20px);
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

.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 520px) {
  .section-actions-row {
    display: grid;
    grid-template-columns: 1fr;
  }

  .two-col,
  .toggle-row {
    display: grid;
  }
}
</style>
