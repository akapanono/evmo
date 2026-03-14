<template>
  <section class="app-screen is-active settings-screen">
    <div class="settings-shell">
      <template v-if="!activeSection">
        <header class="topbar">
          <div>
            <h1>设置</h1>
            <p class="subcopy">把账号、提醒、隐私、备份和 AI 接入集中管理。</p>
          </div>
        </header>

        <article class="profile-hero">
          <Avatar size="xxl" color="ink">{{ displayInitial }}</Avatar>
          <div class="profile-copy">
            <h2>{{ displayName }}</h2>
            <p>{{ profileSummary }}</p>
          </div>
        </article>

        <section class="settings-group">
          <button type="button" class="setting-row" @click="openAccountEntry">
            <div>
              <strong>账号与安全</strong>
              <span>{{ accountSummaryText || _accountSummary }}</span>
            </div>
          </button>
          <button type="button" class="setting-row" @click="openSection('appearance')">
            <div>
              <strong>外观与首页</strong>
              <span>{{ appearanceSummary }}</span>
            </div>
          </button>
          <button type="button" class="setting-row" @click="openSection('ai')">
            <div>
              <strong>AI 与网络</strong>
              <span>{{ aiSummary }}</span>
            </div>
          </button>
          <button type="button" class="setting-row" @click="openSection('privacy')">
            <div>
              <strong>隐私与保护</strong>
              <span>{{ privacySummary }}</span>
            </div>
          </button>
          <button type="button" class="setting-row" @click="openSection('reminder')">
            <div>
              <strong>提醒设置</strong>
              <span>{{ reminderSummary }}</span>
            </div>
          </button>
          <button type="button" class="setting-row" @click="openSection('data')">
            <div>
              <strong>数据与备份</strong>
              <span>{{ dataSummary }}</span>
            </div>
          </button>
          <button type="button" class="setting-row" @click="openSection('about')">
            <div>
              <strong>通用设置</strong>
              <span>{{ aboutSummary }}</span>
            </div>
          </button>
        </section>
      </template>

      <template v-else>
        <header class="detail-top">
          <button type="button" class="back-btn" @click="closeSection">返回</button>
          <div>
            <p class="eyebrow">Section</p>
            <h1>{{ sectionTitle }}</h1>
          </div>
        </header>

        <section v-if="activeSection === 'appearance'" class="detail-stack">
          <article class="panel-card">
            <h3>主题风格</h3>
            <label class="field">
              <span>主题配色</span>
              <select v-model="themeScheme" class="model-select" @change="saveAppearanceSettings">
                <option v-for="item in themeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <div class="theme-preview-grid">
              <button
                v-for="item in themeOptions"
                :key="item.value"
                type="button"
                :class="['theme-chip', { active: themeScheme === item.value }]"
                @click="selectTheme(item.value)"
              >
                <span class="theme-dot" :data-theme-dot="item.value"></span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </article>

          <article class="panel-card">
            <h3>首页布局</h3>
            <label class="field">
              <span>默认首页</span>
              <select v-model="startPage" class="model-select" @change="saveAppearanceSettings">
                <option value="home">首页</option>
                <option value="calendar">纪念日</option>
                <option value="friends">好友</option>
              </select>
            </label>
            <label class="field">
              <span>好友排序方式</span>
              <select v-model="friendSortMode" class="model-select" @change="saveAppearanceSettings">
                <option value="viewed">最近查看优先</option>
                <option value="contact">最近联系优先</option>
                <option value="name">按姓名排序</option>
              </select>
            </label>
            <div class="section-actions-row">
              <button type="button" class="action-btn primary" @click="saveAppearanceSettings">保存外观设置</button>
            </div>
          </article>
        </section>

        <section v-else-if="activeSection === 'ai'" class="detail-stack">
          <article class="panel-card">
            <h3>网络接入</h3>
            <label class="field">
              <span>后端服务地址</span>
              <input v-model="proxyServerUrl" type="text" placeholder="例如 https://api.example.com" />
            </label>
            <label class="field">
              <span>AI 回答风格</span>
              <select v-model="aiStyle" class="model-select">
                <option value="friendly">温和陪伴</option>
                <option value="professional">偏专业建议</option>
                <option value="concise">简短直接</option>
              </select>
            </label>
            <label class="toggle-row">
              <div>
                <strong>允许移动网络调用 AI</strong>
                <span>关闭后仅在 Wi-Fi 环境下走 AI 接口。</span>
              </div>
              <input v-model="allowCellularAI" type="checkbox" />
            </label>
            <div class="section-actions-row">
              <button type="button" class="action-btn" @click="resetAISettings">恢复默认</button>
              <button type="button" class="action-btn" :disabled="testing || !canTestConnection" @click="testConnection">
                {{ testing ? '测试中...' : '测试连接' }}
              </button>
              <button type="button" class="action-btn primary" @click="saveAISettings">保存 AI 设置</button>
            </div>
            <p v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">{{ testResult.message }}</p>
          </article>
        </section>

        <section v-else-if="activeSection === 'privacy'" class="detail-stack">
          <article class="panel-card">
            <h3>隐私保护</h3>
            <label class="toggle-row">
              <div>
                <strong>隐藏敏感信息</strong>
                <span>在部分界面折叠手机号、隐私备注等内容。</span>
              </div>
              <input v-model="hideSensitiveInfo" type="checkbox" />
            </label>
            <label class="toggle-row">
              <div>
                <strong>进入应用时锁定</strong>
                <span>再次进入时需要先解锁再查看内容。</span>
              </div>
              <input v-model="lockScreen" type="checkbox" />
            </label>
            <label class="toggle-row">
              <div>
                <strong>启用生物识别入口</strong>
                <span>为后续指纹或面容解锁预留入口。</span>
              </div>
              <input v-model="biometricLock" type="checkbox" />
            </label>
            <div class="section-actions-row">
              <button type="button" class="action-btn primary" @click="savePrivacySettings">保存隐私设置</button>
            </div>
          </article>
        </section>

        <section v-else-if="activeSection === 'reminder'" class="detail-stack">
          <article class="panel-card">
            <h3>生日提醒</h3>
            <label class="toggle-row">
              <div>
                <strong>开启生日提醒</strong>
                <span>在生日临近时主动提醒你准备礼物或联系对方。</span>
              </div>
              <input v-model="birthdayReminderEnabled" type="checkbox" />
            </label>
            <div class="field-grid">
              <label class="field">
                <span>提前天数</span>
                <input v-model.number="birthdayReminderDaysBefore" type="number" min="0" max="30" />
              </label>
              <label class="field">
                <span>提醒时间</span>
                <input v-model="birthdayReminderTime" type="time" />
              </label>
            </div>
            <div class="section-actions-row">
              <button type="button" class="action-btn primary" @click="saveReminderSettings">保存提醒设置</button>
            </div>
          </article>
        </section>

        <section v-else-if="activeSection === 'data'" class="detail-stack">
          <article class="panel-card">
            <h3>备份策略</h3>
            <label class="toggle-row">
              <div>
                <strong>仅在 Wi-Fi 下备份</strong>
                <span>避免移动网络下同步大量数据。</span>
              </div>
              <input v-model="wifiOnlyBackup" type="checkbox" />
            </label>
            <label class="toggle-row">
              <div>
                <strong>自动备份</strong>
                <span>登录后定期把好友和纪念日同步到云端。</span>
              </div>
              <input v-model="autoBackup" type="checkbox" />
            </label>
            <div class="data-summary">
              <div>
                <strong>{{ friendsStore.friends.length }}</strong>
                <span>位好友</span>
              </div>
              <div>
                <strong>{{ memorialDaysStore.memorialDays.length }}</strong>
                <span>个纪念日</span>
              </div>
            </div>
            <div class="section-actions-row">
              <button type="button" class="action-btn" @click="saveDataSettings">保存备份策略</button>
              <button type="button" class="action-btn" :disabled="backupLoading || !authStore.isLoggedIn" @click="backupToCloud">
                {{ backupLoading ? '备份中...' : '立即备份' }}
              </button>
              <button type="button" class="action-btn primary" :disabled="restoreLoading || !authStore.isLoggedIn" @click="restoreFromCloud">
                {{ restoreLoading ? '恢复中...' : '恢复数据' }}
              </button>
            </div>
            <p v-if="dataMessage" class="test-result success">{{ dataMessage }}</p>
            <p v-if="dataError" class="test-result error">{{ dataError }}</p>
          </article>
        </section>

        <section v-else-if="activeSection === 'about'" class="detail-stack">
          <article class="panel-card">
            <h3>通用信息</h3>
            <label class="field">
              <span>显示昵称</span>
              <input v-model="profileName" type="text" placeholder="例如 小布" />
            </label>
            <label class="field">
              <span>设备名称</span>
              <input v-model="profileDeviceName" type="text" placeholder="例如 我的 Pixel" />
            </label>
            <div class="section-actions-row">
              <button type="button" class="action-btn primary" @click="saveGeneralSettings">保存通用设置</button>
              <button type="button" class="action-btn" @click="resetAllSettings">恢复默认设置</button>
            </div>
          </article>
        </section>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Avatar from '@/components/common/Avatar.vue';
import { aiService } from '@/services/aiService';
import { cloudService } from '@/services/cloudService';
import { useAuthStore } from '@/stores/auth';
import { useFriendsStore } from '@/stores/friends';
import { useMemorialDaysStore } from '@/stores/memorialDays';
import { useSettingsStore } from '@/stores/settings';
import { DEFAULT_PROXY_SERVER_URL, DEFAULT_SETTINGS } from '@/types/settings';
import { THEME_OPTIONS } from '@/utils/theme';

type SettingSection = 'appearance' | 'ai' | 'privacy' | 'reminder' | 'data' | 'about' | null;

const route = useRoute();
const router = useRouter();
const settingsStore = useSettingsStore();
const friendsStore = useFriendsStore();
const memorialDaysStore = useMemorialDaysStore();
const authStore = useAuthStore();

const activeSection = ref<SettingSection>(null);
const proxyServerUrl = ref(DEFAULT_PROXY_SERVER_URL);
const aiStyle = ref<typeof DEFAULT_SETTINGS.aiStyle>(DEFAULT_SETTINGS.aiStyle);
const themeScheme = ref<typeof DEFAULT_SETTINGS.themeScheme>(DEFAULT_SETTINGS.themeScheme);
const startPage = ref<typeof DEFAULT_SETTINGS.startPage>(DEFAULT_SETTINGS.startPage);
const friendSortMode = ref<typeof DEFAULT_SETTINGS.friendSortMode>(DEFAULT_SETTINGS.friendSortMode);
const allowCellularAI = ref(DEFAULT_SETTINGS.allowCellularAI);
const wifiOnlyBackup = ref(DEFAULT_SETTINGS.wifiOnlyBackup);
const autoBackup = ref(DEFAULT_SETTINGS.autoBackup);
const lockScreen = ref(DEFAULT_SETTINGS.lockScreen);
const hideSensitiveInfo = ref(DEFAULT_SETTINGS.hideSensitiveInfo);
const biometricLock = ref(DEFAULT_SETTINGS.biometricLock);
const birthdayReminderEnabled = ref(DEFAULT_SETTINGS.birthdayReminder.enabled);
const birthdayReminderDaysBefore = ref(DEFAULT_SETTINGS.birthdayReminder.daysBefore);
const birthdayReminderTime = ref(DEFAULT_SETTINGS.birthdayReminder.time);
const profileName = ref(DEFAULT_SETTINGS.profileName || '');
const profileDeviceName = ref(DEFAULT_SETTINGS.profileDeviceName || '');
const testing = ref(false);
const backupLoading = ref(false);
const restoreLoading = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const dataMessage = ref('');
const dataError = ref('');

function normalizeSection(value: unknown): SettingSection {
  return value === 'appearance'
    || value === 'ai'
    || value === 'privacy'
    || value === 'reminder'
    || value === 'data'
    || value === 'about'
    ? value
    : null;
}

const themeOptions = THEME_OPTIONS;

const displayName = computed(() => authStore.user?.name || profileName.value || '我的账号');
const displayInitial = computed(() => displayName.value.slice(0, 1) || '我');
const profileSummary = computed(() => `${authStore.isLoggedIn ? '已登录' : '未登录'} · ${friendsStore.friends.length} 位好友 · ${memorialDaysStore.memorialDays.length} 个纪念日`);
const sectionTitle = computed(() => ({
  appearance: '外观与首页',
  ai: 'AI 与网络',
  privacy: '隐私与保护',
  reminder: '提醒设置',
  data: '数据与备份',
  about: '通用设置',
}[activeSection.value || 'about']));
const canTestConnection = computed(() => Boolean(proxyServerUrl.value.trim()));
const _accountSummary = computed(() => {
  if (!authStore.isLoggedIn) {
    return '';
  }

  return `?????${authStore.user?.username || authStore.user?.name || '--'}`;
});
const appearanceSummary = computed(() => `${themeOptions.find((item) => item.value === themeScheme.value)?.label || '默认主题'} · 默认首页 ${startPageLabel(startPage.value)}`);
const aiSummary = computed(() => `${proxyServerUrl.value.trim() ? '已配置服务地址' : '未配置服务地址'} · ${allowCellularAI.value ? '允许移动网络' : '仅 Wi-Fi'}`);
const privacySummary = computed(() => [hideSensitiveInfo.value ? '隐藏敏感信息' : null, lockScreen.value ? '进入需解锁' : null, biometricLock.value ? '生物识别入口已开' : null].filter(Boolean).join(' / ') || '标准保护');
const reminderSummary = computed(() => birthdayReminderEnabled.value ? `提前 ${birthdayReminderDaysBefore.value} 天 · ${birthdayReminderTime.value}` : '生日提醒已关闭');
const dataSummary = computed(() => `${wifiOnlyBackup.value ? '仅 Wi-Fi 备份' : '允许移动网络备份'} · ${autoBackup.value ? '自动备份开启' : '手动备份'}`);
const aboutSummary = computed(() => `${profileDeviceName.value || '当前设备'} · 好友排序 ${friendSortModeLabel(friendSortMode.value)}`);

const accountSummaryText = computed(() => {
  if (!authStore.isLoggedIn) {
    return '未登录，可使用账号密码登录或注册。';
  }

  return `当前账号：${authStore.user?.username || authStore.user?.name || '--'}`;
});

onMounted(async () => {
  await Promise.all([
    friendsStore.loadFriends(),
    memorialDaysStore.loadMemorialDays(),
    authStore.refreshCurrentUser(),
  ]);
  loadSettingsIntoForm();
  activeSection.value = normalizeSection(route.query.section);
});

watch(() => route.query.section, (value) => {
  activeSection.value = normalizeSection(value);
  resetFeedback();
});

function loadSettingsIntoForm(): void {
  const current = settingsStore.settings;
  proxyServerUrl.value = current.proxyServerUrl || DEFAULT_PROXY_SERVER_URL;
  aiStyle.value = current.aiStyle;
  themeScheme.value = current.themeScheme;
  startPage.value = current.startPage;
  friendSortMode.value = current.friendSortMode;
  allowCellularAI.value = current.allowCellularAI;
  wifiOnlyBackup.value = current.wifiOnlyBackup;
  autoBackup.value = current.autoBackup;
  lockScreen.value = current.lockScreen;
  hideSensitiveInfo.value = current.hideSensitiveInfo;
  biometricLock.value = current.biometricLock;
  birthdayReminderEnabled.value = current.birthdayReminder.enabled;
  birthdayReminderDaysBefore.value = current.birthdayReminder.daysBefore;
  birthdayReminderTime.value = current.birthdayReminder.time;
  profileName.value = current.profileName || '';
  profileDeviceName.value = current.profileDeviceName || '';
}

function openAccountEntry(): void {
  void router.push({ path: '/auth', query: { redirect: route.fullPath } });
}

function openSection(section: Exclude<SettingSection, null>): void {
  void router.push({
    name: 'me',
    query: {
      section,
    },
  });
}

function closeSection(): void {
  if (window.history.length > 1) {
    void router.back();
    return;
  }

  void router.push({
    name: 'me',
  });
}

function resetFeedback(): void {
  dataMessage.value = '';
  dataError.value = '';
  testResult.value = null;
}

function saveAppearanceSettings(): void {
  settingsStore.updateSettings({
    themeScheme: themeScheme.value,
    startPage: startPage.value,
    friendSortMode: friendSortMode.value,
  });
}

function saveAISettings(): void {
  testResult.value = null;
  settingsStore.updateSettings({
    proxyServerUrl: DEFAULT_PROXY_SERVER_URL,
    aiStyle: aiStyle.value,
    allowCellularAI: allowCellularAI.value,
  });
  proxyServerUrl.value = DEFAULT_PROXY_SERVER_URL;
}

function savePrivacySettings(): void {
  settingsStore.updateSettings({
    hideSensitiveInfo: hideSensitiveInfo.value,
    lockScreen: lockScreen.value,
    biometricLock: biometricLock.value,
  });
}

function saveReminderSettings(): void {
  settingsStore.updateSettings({
    birthdayReminder: {
      enabled: birthdayReminderEnabled.value,
      daysBefore: Math.max(0, Math.min(30, Number(birthdayReminderDaysBefore.value) || 0)),
      time: birthdayReminderTime.value || '09:00',
    },
  });
}

function saveDataSettings(): void {
  settingsStore.updateSettings({
    wifiOnlyBackup: wifiOnlyBackup.value,
    autoBackup: autoBackup.value,
  });
}

function saveGeneralSettings(): void {
  settingsStore.updateSettings({
    profileName: profileName.value.trim() || DEFAULT_SETTINGS.profileName,
    profileDeviceName: profileDeviceName.value.trim() || DEFAULT_SETTINGS.profileDeviceName,
  });
}

function resetAISettings(): void {
  proxyServerUrl.value = DEFAULT_SETTINGS.proxyServerUrl || DEFAULT_PROXY_SERVER_URL;
  aiStyle.value = DEFAULT_SETTINGS.aiStyle;
  allowCellularAI.value = DEFAULT_SETTINGS.allowCellularAI;
  saveAISettings();
}

function resetAllSettings(): void {
  settingsStore.resetSettings();
  loadSettingsIntoForm();
}

function selectTheme(value: typeof DEFAULT_SETTINGS.themeScheme): void {
  themeScheme.value = value;
  settingsStore.updateSettings({
    themeScheme: value,
  });
}

async function testConnection(): Promise<void> {
  testing.value = true;
  testResult.value = null;

  try {
    saveAISettings();
    testResult.value = await aiService.testProxyConnection();
  } catch (error) {
    testResult.value = {
      success: false,
      message: `测试失败：${(error as Error).message}`,
    };
  } finally {
    testing.value = false;
  }
}

async function backupToCloud(): Promise<void> {
  resetFeedback();
  backupLoading.value = true;

  try {
    saveDataSettings();
    const result = await cloudService.backupToCloud();
    dataMessage.value = `备份完成：${result.savedAt}`;
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
    const result = await cloudService.restoreFromCloud();
    if (result.settings) {
      settingsStore.updateSettings(result.settings);
    }
    await Promise.all([
      friendsStore.loadFriends(),
      memorialDaysStore.loadMemorialDays(),
    ]);
    loadSettingsIntoForm();
    dataMessage.value = `恢复完成：${result.restoredAt}`;
  } catch (error) {
    dataError.value = `恢复失败：${(error as Error).message}`;
  } finally {
    restoreLoading.value = false;
  }
}

function startPageLabel(value: typeof DEFAULT_SETTINGS.startPage): string {
  return value === 'calendar' ? '纪念日' : value === 'friends' ? '好友' : '首页';
}

function friendSortModeLabel(value: typeof DEFAULT_SETTINGS.friendSortMode): string {
  return value === 'contact' ? '最近联系' : value === 'name' ? '姓名顺序' : '最近查看';
}
</script>

<style scoped>
.settings-screen {
  overflow-y: auto;
  padding: 20px 16px 36px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--gold) 18%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--body-grad-start) 96%, var(--paper)), color-mix(in srgb, var(--body-grad-end) 94%, var(--paper)));
}

.settings-shell,
.detail-stack,
.field-grid,
.data-summary {
  display: grid;
  gap: 16px;
}

.settings-top,
.detail-top,
.profile-hero,
.panel-card,
.settings-group {
  border-radius: 24px;
  background: color-mix(in srgb, var(--card-soft) 96%, transparent);
  box-shadow: 0 18px 40px var(--nav-shadow);
}

.settings-top,
.detail-top,
.profile-hero,
.panel-card {
  padding: 18px;
}

.profile-hero {
  display: flex;
  gap: 16px;
  align-items: center;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--muted);
}

.subcopy,
.profile-copy p,
.setting-row span,
.field-hint,
.toggle-row span {
  color: var(--muted);
}

.subcopy {
  display: none;
}

.settings-top h1,
.detail-top h1,
.profile-copy h2,
.panel-card h3 {
  margin: 6px 0 0;
  color: var(--ink);
}

.settings-group {
  overflow: hidden;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 18px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.setting-row:last-child {
  border-bottom: 0;
}

.setting-row strong,
.toggle-row strong {
  display: block;
  color: var(--ink);
}

.detail-top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-btn,
.action-btn,
.theme-chip {
  border: 0;
  border-radius: 18px;
  font: inherit;
}

.back-btn {
  min-width: 72px;
  height: 40px;
  background: var(--surface-3);
  color: var(--ink);
}

.panel-card {
  display: grid;
  gap: 14px;
}

.field-grid,
.data-summary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-panel) 90%, var(--paper));
  border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
}

.toggle-row input {
  width: 18px;
  height: 18px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: var(--ink);
  font-size: 13px;
}

.field input,
.field select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 13px 14px;
  background: var(--white);
  color: var(--ink);
  font: inherit;
}

.section-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-btn {
  min-height: 42px;
  padding: 0 16px;
  background: var(--surface-3);
  color: var(--ink);
}

.action-btn.primary {
  background: var(--ink);
  color: var(--white-soft);
}

.data-summary > div {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-panel) 90%, var(--paper));
  border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
}

.data-summary strong {
  color: var(--ink);
  font-size: 24px;
}

.theme-preview-grid {
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

.theme-dot[data-theme-dot='default'] { background: linear-gradient(135deg, #dc6c56, #2f8a82); }
.theme-dot[data-theme-dot='forest'] { background: linear-gradient(135deg, #6e8f52, #4e8a68); }
.theme-dot[data-theme-dot='sunset'] { background: linear-gradient(135deg, #d96e4d, #d79b42); }
.theme-dot[data-theme-dot='ocean'] { background: linear-gradient(135deg, #4d8aac, #5f8f8c); }

.test-result {
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
}

.test-result.success {
  background: var(--success-bg);
  color: var(--success-text);
}

.test-result.error {
  background: var(--danger-bg);
  color: var(--danger-text);
}

@media (max-width: 640px) {
  .profile-hero,
  .detail-top,
  .toggle-row,
  .setting-row {
    align-items: flex-start;
  }

  .field-grid,
  .data-summary,
  .theme-preview-grid {
    grid-template-columns: 1fr;
  }

  .section-actions-row {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
