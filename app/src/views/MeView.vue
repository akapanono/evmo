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
        <span>API Key、回答风格、默认提问</span>
      </article>
    </div>

    <section v-if="showAISettings" class="section-block">
      <div class="section-head">
        <h3>AI 设置</h3>
      </div>

      <article class="form-card">
        <div class="field-grid">
          <label class="field">
            <span>OpenAI API Key</span>
            <input v-model="apiKey" type="password" placeholder="sk-..." />
            <p class="field-hint warning">
              API Key 当前保存在浏览器本地，仅适合原型验证，不建议用于正式发布版本。
            </p>
          </label>

          <label class="field">
            <span>模型</span>
            <select v-model="model" class="model-select">
              <optgroup label="OpenAI">
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </optgroup>
              <optgroup label="兼容模型">
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
                <option value="gemini-pro">Gemini Pro</option>
              </optgroup>
            </select>
            <p class="field-hint">建议优先使用 GPT-4o 或 GPT-4o Mini。</p>
          </label>

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
          <button type="button" class="action-btn" @click="showAISettings = false">
            取消
          </button>
          <button type="button" class="action-btn" @click="testAPI" :disabled="!apiKey.trim() || testing">
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <button type="button" class="action-btn primary" @click="saveAISettings">
            保存
          </button>
        </div>

        <p v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
          {{ testResult.message }}
        </p>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Avatar from '@/components/common/Avatar.vue';
import { aiService } from '@/services/aiService';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

const showAISettings = ref(false);
const apiKey = ref('');
const model = ref('gpt-3.5-turbo');
const aiStyle = ref<'friendly' | 'professional' | 'concise'>('friendly');
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

onMounted(() => {
  apiKey.value = settingsStore.settings.openaiApiKey || '';
  model.value = settingsStore.settings.openaiModel;
  aiStyle.value = settingsStore.settings.aiStyle;
});

function openSection(section: string): void {
  if (section !== 'ai') {
    return;
  }

  showAISettings.value = true;
  apiKey.value = settingsStore.settings.openaiApiKey || '';
  model.value = settingsStore.settings.openaiModel;
  aiStyle.value = settingsStore.settings.aiStyle;
  testResult.value = null;
}

async function testAPI(): Promise<void> {
  if (!apiKey.value.trim()) {
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    testResult.value = await aiService.testAPIKey(apiKey.value, model.value);
  } catch (err) {
    testResult.value = {
      success: false,
      message: `测试失败：${(err as Error).message}`,
    };
  } finally {
    testing.value = false;
  }
}

function saveAISettings(): void {
  settingsStore.updateSettings({
    openaiApiKey: apiKey.value || undefined,
    openaiModel: model.value,
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
