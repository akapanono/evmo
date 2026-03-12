<template>
  <section
    ref="screenRef"
    class="app-screen is-active"
    @touchstart.passive="handleTouchStart"
    @touchmove.passive="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <div class="pull-indicator" :class="{ visible: pullDistance > 8 || refreshing }">
      {{ refreshing ? '刷新中...' : pullDistance >= REFRESH_TRIGGER ? '松开刷新' : '下拉刷新' }}
    </div>

    <div :style="contentStyle">
      <div class="topbar">
        <div>
          <p class="eyebrow">我的</p>
          <h1>友记设置</h1>
        </div>
      </div>

      <article class="profile-panel">
        <Avatar size="xxl" color="ink">友记</Avatar>
        <div>
          <h2>账号、主题、AI 与云备份</h2>
          <p>{{ statsSummary }}</p>
        </div>
      </article>

      <section class="section-block">
        <div class="section-head">
          <h3>账号登录</h3>
        </div>

        <article class="form-card">
          <template v-if="authStore.isLoggedIn && authStore.user">
            <div class="connection-status connected">
              <strong>已登录</strong>
              <span>{{ authStore.user.name || authStore.user.phone }}</span>
            </div>

            <div class="data-summary single">
              <div>
                <strong>{{ authStore.user.name || '未命名用户' }}</strong>
                <span>{{ authStore.user.phone }}</span>
              </div>
            </div>

            <div class="section-actions-row">
              <button type="button" class="action-btn" @click="refreshProfile" :disabled="authStore.loading">
                刷新账号
              </button>
              <button type="button" class="action-btn" @click="logout">
                退出登录
              </button>
            </div>
          </template>

          <template v-else>
            <div class="field-grid">
              <label class="field">
                <span>昵称</span>
                <input v-model="authName" type="text" placeholder="首次注册可填写" />
              </label>

              <label class="field">
                <span>手机号</span>
                <input v-model="authPhone" type="text" inputmode="numeric" placeholder="请输入手机号" />
              </label>

              <label class="field">
                <span>密码</span>
                <input v-model="authPassword" type="password" placeholder="请输入密码" />
              </label>
            </div>

            <div class="section-actions-row">
              <button type="button" class="action-btn" @click="register" :disabled="authStore.loading">
                {{ authStore.loading ? '处理中...' : '注册并登录' }}
              </button>
              <button type="button" class="action-btn primary" @click="login" :disabled="authStore.loading">
                {{ authStore.loading ? '处理中...' : '登录' }}
              </button>
            </div>
          </template>

          <p v-if="authMessage" class="test-result success">{{ authMessage }}</p>
          <p v-if="authError" class="test-result error">{{ authError }}</p>
        </article>
      </section>

      <section class="section-block">
        <div class="section-head">
          <h3>外观主题</h3>
        </div>

        <article class="form-card">
          <div class="field-grid">
            <label class="field">
              <span>界面配色</span>
              <select v-model="themeScheme" class="model-select" @change="saveAISettings">
                <option v-for="item in themeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <p class="field-hint">{{ selectedThemeDescription }}</p>
            </label>
          </div>

          <div class="theme-preview-grid">
            <button
              v-for="item in themeOptions"
              :key="item.value"
              type="button"
              :class="['theme-chip', { active: themeScheme === item.value }]"
              @click="selectTheme(item.value)"
            >
              <span class="theme-dot" :data-theme-dot="item.value"></span>
              <strong>{{ item.label }}</strong>
            </button>
          </div>
        </article>
      </section>

      <section class="section-block">
        <div class="section-head">
          <h3>AI 服务</h3>
        </div>

        <article class="form-card">
          <div :class="['connection-status', connectionSummary.configured ? 'connected' : 'disconnected']">
            <strong>{{ connectionSummary.configured ? '已配置代理服务' : '尚未配置后端地址' }}</strong>
            <span>{{ summaryLine }}</span>
          </div>

          <div class="field-grid">
            <label class="field">
              <span>代理服务地址</span>
              <input v-model="proxyServerUrl" type="text" placeholder="http://localhost:9090" />
              <p class="field-hint">
                手机真机不能用 `localhost` 访问你电脑上的后端，请改成你电脑在局域网里的地址，例如 `http://192.168.1.23:9090`。
              </p>
            </label>

            <label class="field">
              <span>AI 风格</span>
              <select v-model="aiStyle" class="model-select">
                <option value="friendly">自然一点</option>
                <option value="professional">稳一点</option>
                <option value="concise">简洁一点</option>
              </select>
            </label>
          </div>

          <div class="section-actions-row">
            <button type="button" class="action-btn" @click="resetAISettings">恢复默认</button>
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
          <h3>云端备份</h3>
        </div>

        <article class="form-card data-card">
          <div class="data-summary">
            <div>
              <strong>{{ friendsStore.friends.length }}</strong>
              <span>位朋友</span>
            </div>
            <div>
              <strong>{{ memorialDaysStore.memorialDays.length }}</strong>
              <span>条纪念日</span>
            </div>
          </div>

          <p class="field-hint">
            原来的导入导出已替换成云端备份与恢复。登录后可把当前设备数据备份到后端，也可以从后端恢复到当前设备。
          </p>

          <div class="section-actions-row">
            <button type="button" class="action-btn" @click="backupToCloud" :disabled="backupLoading || !authStore.isLoggedIn">
              {{ backupLoading ? '备份中...' : '备份到云端' }}
            </button>
            <button type="button" class="action-btn primary" @click="restoreFromCloud" :disabled="restoreLoading || !authStore.isLoggedIn">
              {{ restoreLoading ? '恢复中...' : '从云端恢复' }}
            </button>
          </div>

          <p v-if="dataMessage" class="test-result success">{{ dataMessage }}</p>
          <p v-if="dataError" class="test-result error">{{ dataError }}</p>
        </article>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Avatar from '@/components/common/Avatar.vue';
import { aiService } from '@/services/aiService';
import { cloudService } from '@/services/cloudService';
import { useAuthStore } from '@/stores/auth';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import { useSettingsStore } from '@/stores/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { THEME_OPTIONS } from '@/utils/theme';

const settingsStore = useSettingsStore();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();
const authStore = useAuthStore();

const DEFAULT_PROXY_SERVER_URL = 'http://localhost:9090';
const REFRESH_TRIGGER = 72;

const proxyServerUrl = ref(DEFAULT_PROXY_SERVER_URL);
const aiStyle = ref<'friendly' | 'professional' | 'concise'>('friendly');
const themeScheme = ref<typeof DEFAULT_SETTINGS.themeScheme>(DEFAULT_SETTINGS.themeScheme);
const testing = ref(false);
const backupLoading = ref(false);
const restoreLoading = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const authName = ref('');
const authPhone = ref('');
const authPassword = ref('');
const authMessage = ref('');
const authError = ref('');
const dataMessage = ref('');
const dataError = ref('');
const screenRef = ref<HTMLElement | null>(null);
const pullDistance = ref(0);
const refreshing = ref(false);
let touchStartY = 0;
let pullActive = false;

const themeOptions = THEME_OPTIONS;

const contentStyle = computed(() => ({
  transform: pullDistance.value > 0 ? `translateY(${pullDistance.value}px)` : undefined,
  transition: refreshing.value || pullDistance.value === 0 ? 'transform 180ms ease' : undefined,
}));

const connectionSummary = computed(() => ({
  configured: Boolean(proxyServerUrl.value.trim()),
  baseUrl: proxyServerUrl.value.trim() || DEFAULT_PROXY_SERVER_URL,
}));

const summaryLine = computed(() => connectionSummary.value.baseUrl);
const canTestConnection = computed(() => Boolean(proxyServerUrl.value.trim()));
const selectedThemeDescription = computed(() => (
  themeOptions.find((item) => item.value === themeScheme.value)?.description ?? ''
));
const statsSummary = computed(() => `当前有 ${friendsStore.friends.length} 位朋友，${memorialDaysStore.memorialDays.length} 条纪念日。`);

onMounted(async () => {
  await Promise.all([
    friendsStore.loadFriends(),
    memorialDaysStore.loadMemorialDays(),
    authStore.refreshCurrentUser(),
  ]);
  loadAISettings();
});

function loadAISettings(): void {
  proxyServerUrl.value = settingsStore.settings.proxyServerUrl || DEFAULT_PROXY_SERVER_URL;
  aiStyle.value = settingsStore.settings.aiStyle;
  themeScheme.value = settingsStore.settings.themeScheme;
}

function saveAISettings(): void {
  testResult.value = null;
  settingsStore.updateSettings({
    aiAccessMode: 'proxy',
    openaiApiKey: undefined,
    openaiBaseUrl: undefined,
    openaiModel: settingsStore.settings.openaiModel || DEFAULT_SETTINGS.openaiModel,
    proxyServerUrl: proxyServerUrl.value.trim() || DEFAULT_PROXY_SERVER_URL,
    proxyProviderId: undefined,
    aiStyle: aiStyle.value,
    themeScheme: themeScheme.value,
  });
}

function resetAISettings(): void {
  testResult.value = null;
  settingsStore.updateSettings({
    aiAccessMode: 'proxy',
    openaiApiKey: undefined,
    openaiBaseUrl: undefined,
    openaiModel: DEFAULT_SETTINGS.openaiModel,
    proxyServerUrl: DEFAULT_SETTINGS.proxyServerUrl,
    proxyProviderId: undefined,
    aiStyle: DEFAULT_SETTINGS.aiStyle,
    themeScheme: DEFAULT_SETTINGS.themeScheme,
  });
  loadAISettings();
}

function selectTheme(value: typeof DEFAULT_SETTINGS.themeScheme): void {
  themeScheme.value = value;
  saveAISettings();
}

function resetFeedback(): void {
  authMessage.value = '';
  authError.value = '';
  dataMessage.value = '';
  dataError.value = '';
}

function validateAuthForm(): boolean {
  authError.value = '';
  if (!authPhone.value.trim()) {
    authError.value = '请输入手机号。';
    return false;
  }
  if (!authPassword.value.trim()) {
    authError.value = '请输入密码。';
    return false;
  }
  return true;
}

async function register(): Promise<void> {
  resetFeedback();
  if (!validateAuthForm()) return;
  try {
    saveAISettings();
    await authStore.register({
      name: authName.value.trim(),
      phone: authPhone.value.trim(),
      password: authPassword.value,
    });
    authMessage.value = '注册并登录成功。';
  } catch (error) {
    authError.value = (error as Error).message;
  }
}

async function login(): Promise<void> {
  resetFeedback();
  if (!validateAuthForm()) return;
  try {
    saveAISettings();
    await authStore.login({
      phone: authPhone.value.trim(),
      password: authPassword.value,
    });
    authMessage.value = '登录成功。';
  } catch (error) {
    authError.value = (error as Error).message;
  }
}

async function refreshProfile(): Promise<void> {
  resetFeedback();
  try {
    await authStore.refreshCurrentUser();
    authMessage.value = '账号信息已刷新。';
  } catch (error) {
    authError.value = (error as Error).message;
  }
}

function logout(): void {
  authStore.logout();
  authMessage.value = '已退出登录。';
}

async function testConnection(): Promise<void> {
  testing.value = true;
  testResult.value = null;
  try {
    saveAISettings();
    testResult.value = await aiService.testProxyConnection();
  } catch (error) {
    testResult.value = { success: false, message: `测试失败：${(error as Error).message}` };
  } finally {
    testing.value = false;
  }
}

async function backupToCloud(): Promise<void> {
  resetFeedback();
  backupLoading.value = true;
  try {
    saveAISettings();
    const result = await cloudService.backupToCloud();
    dataMessage.value = `已备份到云端：${result.savedAt}`;
  } catch (error) {
    dataError.value = `备份失败：${(error as Error).message}`;
  } finally {
    backupLoading.value = false;
  }
}

async function restoreFromCloud(): Promise<void> {
  resetFeedback();
  restoreLoading.value = true;
  try {
    saveAISettings();
    const result = await cloudService.restoreFromCloud();
    if (result.settings) {
      settingsStore.updateSettings(result.settings);
    }
    await Promise.all([
      friendsStore.loadFriends(),
      memorialDaysStore.loadMemorialDays(),
    ]);
    loadAISettings();
    dataMessage.value = `已从云端恢复：${result.restoredAt}`;
  } catch (error) {
    dataError.value = `恢复失败：${(error as Error).message}`;
  } finally {
    restoreLoading.value = false;
  }
}

async function refreshPage(): Promise<void> {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    await Promise.all([
      friendsStore.loadFriends(),
      memorialDaysStore.loadMemorialDays(),
      authStore.refreshCurrentUser(),
    ]);
    loadAISettings();
  } finally {
    refreshing.value = false;
  }
}

function handleTouchStart(event: TouchEvent): void {
  if (screenRef.value?.scrollTop) {
    pullActive = false;
    pullDistance.value = 0;
    return;
  }
  touchStartY = event.touches[0]?.clientY ?? 0;
  pullActive = true;
}

function handleTouchMove(event: TouchEvent): void {
  if (!pullActive || refreshing.value) return;
  const currentY = event.touches[0]?.clientY ?? touchStartY;
  const deltaY = currentY - touchStartY;
  if (deltaY <= 0) {
    pullDistance.value = 0;
    return;
  }
  pullDistance.value = Math.min(96, deltaY * 0.42);
}

async function handleTouchEnd(): Promise<void> {
  if (!pullActive) {
    pullDistance.value = 0;
    return;
  }
  pullActive = false;
  const shouldRefresh = pullDistance.value >= REFRESH_TRIGGER;
  pullDistance.value = 0;
  if (shouldRefresh) {
    await refreshPage();
  }
}
</script>

<style scoped>
.pull-indicator {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  opacity: 0;
  transition: height 180ms ease, opacity 180ms ease;
}

.pull-indicator.visible {
  height: 28px;
  opacity: 1;
}

.model-select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px;
  background: var(--white);
  color: var(--ink);
  font: inherit;
}

.field-hint {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.connection-status {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 16px;
  margin-bottom: 14px;
}

.connection-status.connected {
  background: color-mix(in srgb, var(--teal) 10%, transparent);
  color: var(--teal);
}

.connection-status.disconnected {
  background: var(--danger-bg);
  color: var(--danger-text);
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

.data-summary.single {
  grid-template-columns: 1fr;
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

.theme-preview-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.theme-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--surface-1);
  color: var(--ink);
}

.theme-chip.active {
  background: var(--ink);
  color: var(--white-soft);
}

.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.theme-dot[data-theme-dot='default'] {
  background: linear-gradient(135deg, #dc6c56, #2f8a82);
}

.theme-dot[data-theme-dot='forest'] {
  background: linear-gradient(135deg, #6e8f52, #4e8a68);
}

.theme-dot[data-theme-dot='sunset'] {
  background: linear-gradient(135deg, #d96e4d, #d79b42);
}

.theme-dot[data-theme-dot='ocean'] {
  background: linear-gradient(135deg, #4d8aac, #5f8f8c);
}

.test-result {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.test-result.success {
  background: var(--success-bg);
  color: var(--success-text);
}

.test-result.error {
  background: var(--danger-bg);
  color: var(--danger-text);
}

@media (max-width: 520px) {
  .section-actions-row,
  .data-summary,
  .theme-preview-grid {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
