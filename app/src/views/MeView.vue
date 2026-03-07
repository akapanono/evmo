<template>
  <section class="app-screen is-active">
    <div class="topbar">
      <div>
        <p class="eyebrow">我的</p>
        <h1>账号与设置</h1>
      </div>
    </div>

    <article class="profile-panel">
      <Avatar :size="'xxl'" color="ink">我</Avatar>
      <div>
        <h2>你的账号</h2>
        <p>用于管理提醒策略、隐私设置和 AI 使用偏好。</p>
      </div>
    </article>

    <div class="settings-list">
      <article @click="openSection('account')">
        <strong>账号信息</strong>
        <span>手机号、昵称、登录设备</span>
      </article>
      <article @click="openSection('reminders')">
        <strong>提醒设置</strong>
        <span>生日提醒、久未联系提醒、重要事件提醒</span>
      </article>
      <article @click="openSection('privacy')">
        <strong>隐私与安全</strong>
        <span>锁屏隐藏、敏感信息展示、数据保护</span>
      </article>
      <article @click="openSection('ai')">
        <strong>AI 设置</strong>
        <span>API Key、回答风格、默认提问模式</span>
      </article>
    </div>

    <!-- AI 设置面板 -->
    <section v-if="showAISettings" class="section-block">
      <div class="section-head">
        <h3>AI 设置</h3>
      </div>
      <article class="form-card">
        <div class="field-grid">
          <label class="field">
            <span>OpenAI API Key</span>
            <input
              v-model="apiKey"
              type="password"
              placeholder="sk-..."
            />
          </label>
          <label class="field">
            <span>模型</span>
            <select v-model="model" class="model-select">
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </label>
          <label class="field">
            <span>回答风格</span>
            <select v-model="aiStyle" class="model-select">
              <option value="friendly">亲切友好</option>
              <option value="professional">专业周到</option>
              <option value="concise">简洁明了</option>
            </select>
          </label>
        </div>
        <div class="sticky-actions" style="margin-top: 14px; position: static; background: none; padding: 0;">
          <button type="button" class="action-btn" @click="showAISettings = false">
            取消
          </button>
          <button type="button" class="action-btn primary" @click="saveAISettings">
            保存
          </button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import Avatar from '@/components/common/Avatar.vue';

const settingsStore = useSettingsStore();

const showAISettings = ref(false);
const apiKey = ref('');
const model = ref('gpt-3.5-turbo');
const aiStyle = ref<'friendly' | 'professional' | 'concise'>('friendly');

onMounted(() => {
  apiKey.value = settingsStore.settings.openaiApiKey || '';
  model.value = settingsStore.settings.openaiModel;
  aiStyle.value = settingsStore.settings.aiStyle;
});

function openSection(section: string): void {
  if (section === 'ai') {
    showAISettings.value = true;
    apiKey.value = settingsStore.settings.openaiApiKey || '';
    model.value = settingsStore.settings.openaiModel;
    aiStyle.value = settingsStore.settings.aiStyle;
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
</style>
