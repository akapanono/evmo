<template>
  <section class="app-screen is-active auth-screen">
    <div class="auth-shell">
      <header class="auth-hero">
        <button type="button" class="back-btn" @click="goBack">返回</button>
        <div class="hero-copy">
          <p class="eyebrow">ACCOUNT</p>
          <h1>登录与注册</h1>
          <p class="hero-text">
            账号体系单独放成一个模块。当前支持手机号密码登录、手机号验证码注册和微信/QQ 快速登录入口。
          </p>
        </div>
      </header>

      <template v-if="!authStore.isLoggedIn">
        <section class="auth-board">
          <aside class="entry-panel">
            <button
              type="button"
              :class="['entry-card', { active: activeView === 'login' }]"
              @click="activeView = 'login'"
            >
              <span class="entry-kicker">SIGN IN</span>
              <strong>登录</strong>
              <p>手机号加密码直接进入。</p>
            </button>
            <button
              type="button"
              :class="['entry-card', { active: activeView === 'register' }]"
              @click="activeView = 'register'"
            >
              <span class="entry-kicker">SIGN UP</span>
              <strong>注册</strong>
              <p>默认是手机号验证码注册，也保留密码注册兜底。</p>
            </button>
          </aside>

          <article class="auth-card">
            <template v-if="activeView === 'login'">
              <div class="card-head">
                <div>
                  <p class="section-kicker">WELCOME BACK</p>
                  <h2>账号登录</h2>
                </div>
                <button type="button" class="switch-link" @click="activeView = 'register'">
                  去注册
                </button>
              </div>

              <div class="card-stack">
                <label class="field">
                  <span>手机号</span>
                  <input
                    v-model="loginForm.phone"
                    type="text"
                    inputmode="numeric"
                    placeholder="请输入手机号"
                  />
                </label>
                <label class="field">
                  <span>密码</span>
                  <input
                    v-model="loginForm.password"
                    type="password"
                    placeholder="请输入密码"
                  />
                </label>
                <button
                  type="button"
                  class="primary-btn"
                  :disabled="authStore.loading"
                  @click="submitPhoneLogin"
                >
                  {{ authStore.loading ? '登录中...' : '立即登录' }}
                </button>
              </div>
            </template>

            <template v-else>
              <div class="card-head">
                <div>
                  <p class="section-kicker">CREATE ACCOUNT</p>
                  <h2>手机号注册</h2>
                </div>
                <button type="button" class="switch-link" @click="activeView = 'login'">
                  去登录
                </button>
              </div>

              <div class="sub-tabs">
                <button
                  type="button"
                  :class="['sub-tab', { active: registerMode === 'code' }]"
                  @click="registerMode = 'code'"
                >
                  验证码注册
                </button>
                <button
                  type="button"
                  :class="['sub-tab', { active: registerMode === 'password' }]"
                  @click="registerMode = 'password'"
                >
                  密码注册
                </button>
              </div>

              <div v-if="registerMode === 'code'" class="card-stack">
                <label class="field">
                  <span>手机号</span>
                  <input
                    v-model="codeRegisterForm.phone"
                    type="text"
                    inputmode="numeric"
                    placeholder="请输入手机号"
                  />
                </label>

                <label class="field">
                  <span>验证码</span>
                  <div class="inline-field">
                    <input
                      v-model="codeRegisterForm.code"
                      type="text"
                      inputmode="numeric"
                      placeholder="请输入验证码"
                    />
                    <button
                      type="button"
                      class="inline-btn"
                      :disabled="authStore.loading || countdown > 0"
                      @click="sendRegisterCode"
                    >
                      {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                    </button>
                  </div>
                </label>

                <label class="field">
                  <span>昵称</span>
                  <input
                    v-model="codeRegisterForm.name"
                    type="text"
                    placeholder="不填则自动生成"
                  />
                </label>

                <div v-if="codeHint" class="notice-card">
                  <strong>开发联调验证码</strong>
                  <p>{{ codeHint }}</p>
                </div>

                <button
                  type="button"
                  class="primary-btn"
                  :disabled="authStore.loading"
                  @click="submitCodeRegister"
                >
                  {{ authStore.loading ? '注册中...' : '验证码注册' }}
                </button>
              </div>

              <div v-else class="card-stack">
                <label class="field">
                  <span>昵称</span>
                  <input
                    v-model="passwordRegisterForm.name"
                    type="text"
                    placeholder="请输入昵称"
                  />
                </label>
                <label class="field">
                  <span>手机号</span>
                  <input
                    v-model="passwordRegisterForm.phone"
                    type="text"
                    inputmode="numeric"
                    placeholder="请输入手机号"
                  />
                </label>
                <label class="field">
                  <span>密码</span>
                  <input
                    v-model="passwordRegisterForm.password"
                    type="password"
                    placeholder="请设置密码"
                  />
                </label>
                <button
                  type="button"
                  class="primary-btn"
                  :disabled="authStore.loading"
                  @click="submitPasswordRegister"
                >
                  {{ authStore.loading ? '注册中...' : '完成注册' }}
                </button>
              </div>
            </template>

            <div class="divider">
              <span>或使用第三方快速进入</span>
            </div>

            <div class="provider-row">
              <button
                type="button"
                class="provider-btn wechat"
                :disabled="authStore.loading"
                @click="submitProviderLogin('wechat')"
              >
                微信登录
              </button>
              <button
                type="button"
                class="provider-btn qq"
                :disabled="authStore.loading"
                @click="submitProviderLogin('qq')"
              >
                QQ 登录
              </button>
            </div>

            <p class="provider-note">
              当前还是开发接法，正式上线前要替换成微信开放平台和 QQ 互联的真实登录。
            </p>

            <p v-if="message" class="feedback success">{{ message }}</p>
            <p v-if="error" class="feedback error">{{ error }}</p>
          </article>
        </section>
      </template>

      <template v-else>
        <section class="logged-shell">
          <article class="auth-card">
            <div class="card-head">
              <div>
                <p class="section-kicker">ACCOUNT READY</p>
                <h2>{{ authStore.user?.name || '已登录账号' }}</h2>
              </div>
              <button type="button" class="switch-link" @click="refreshCurrentUser">
                刷新
              </button>
            </div>

            <div class="summary-grid">
              <div class="summary-item">
                <span>手机号</span>
                <strong>{{ authStore.user?.phone || '未绑定' }}</strong>
              </div>
              <div class="summary-item">
                <span>微信</span>
                <strong>{{ authStore.user?.bindings.wechat ? '已绑定' : '未绑定' }}</strong>
              </div>
              <div class="summary-item">
                <span>QQ</span>
                <strong>{{ authStore.user?.bindings.qq ? '已绑定' : '未绑定' }}</strong>
              </div>
              <div class="summary-item">
                <span>密码</span>
                <strong>{{ authStore.user?.hasPassword ? '已设置' : '未设置' }}</strong>
              </div>
            </div>

            <div class="action-row">
              <button type="button" class="secondary-btn" @click="openBindPhonePage">
                绑定手机号
              </button>
              <button type="button" class="danger-btn" @click="logout">
                退出登录
              </button>
            </div>

            <div class="provider-manage">
              <button
                type="button"
                class="provider-btn wechat"
                :disabled="authStore.loading || authStore.user?.bindings.wechat"
                @click="submitBindProvider('wechat')"
              >
                {{ authStore.user?.bindings.wechat ? '微信已绑定' : '绑定微信' }}
              </button>
              <button
                type="button"
                class="provider-btn qq"
                :disabled="authStore.loading || authStore.user?.bindings.qq"
                @click="submitBindProvider('qq')"
              >
                {{ authStore.user?.bindings.qq ? 'QQ 已绑定' : '绑定 QQ' }}
              </button>
            </div>

            <p v-if="message" class="feedback success">{{ message }}</p>
            <p v-if="error" class="feedback error">{{ error }}</p>
          </article>
        </section>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { AuthProvider } from '@/types/auth';

type AuthViewMode = 'login' | 'register';
type RegisterMode = 'code' | 'password';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const activeView = ref<AuthViewMode>('login');
const registerMode = ref<RegisterMode>('code');
const message = ref('');
const error = ref('');
const codeHint = ref('');
const countdown = ref(0);

let countdownTimer: number | undefined;

const loginForm = reactive({
  phone: '',
  password: '',
});

const codeRegisterForm = reactive({
  phone: '',
  code: '',
  name: '',
});

const passwordRegisterForm = reactive({
  name: '',
  phone: '',
  password: '',
});

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' && redirect ? redirect : '/me';
});

function resetFeedback(): void {
  message.value = '';
  error.value = '';
}

function startCountdown(seconds: number): void {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }

  countdown.value = seconds;
  countdownTimer = window.setInterval(() => {
    if (countdown.value <= 1) {
      countdown.value = 0;
      if (countdownTimer) {
        window.clearInterval(countdownTimer);
        countdownTimer = undefined;
      }
      return;
    }

    countdown.value -= 1;
  }, 1000);
}

function goBack(): void {
  void router.push(redirectTarget.value);
}

function buildMockProviderPayload(provider: AuthProvider): { providerId: string; displayName: string } {
  const storageKey = `evmo:mock-provider:${provider}`;
  const cached = window.localStorage.getItem(storageKey);
  if (cached) {
    return {
      providerId: cached,
      displayName: provider === 'wechat' ? '微信用户' : 'QQ 用户',
    };
  }

  const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const providerId = `${provider}_${seed}`;
  window.localStorage.setItem(storageKey, providerId);
  return {
    providerId,
    displayName: provider === 'wechat' ? '微信用户' : 'QQ 用户',
  };
}

async function sendRegisterCode(): Promise<void> {
  resetFeedback();
  codeHint.value = '';

  if (!codeRegisterForm.phone.trim()) {
    error.value = '请输入手机号。';
    return;
  }

  try {
    const result = await authStore.sendRegisterCode(codeRegisterForm.phone.trim());
    startCountdown(Math.min(result.expiresInSeconds, 60));
    message.value = `验证码已发送到 ${result.maskedPhone}。`;
    if (result.devCode) {
      codeHint.value = `开发环境验证码：${result.devCode}`;
    }
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function submitPhoneLogin(): Promise<void> {
  resetFeedback();

  if (!loginForm.phone.trim() || !loginForm.password.trim()) {
    error.value = '请输入手机号和密码。';
    return;
  }

  try {
    await authStore.login({
      phone: loginForm.phone.trim(),
      password: loginForm.password,
    });
    message.value = '登录成功。';
    void router.push(redirectTarget.value);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function submitCodeRegister(): Promise<void> {
  resetFeedback();

  if (!codeRegisterForm.phone.trim() || !codeRegisterForm.code.trim()) {
    error.value = '请输入手机号和验证码。';
    return;
  }

  try {
    await authStore.registerByCode({
      name: codeRegisterForm.name.trim(),
      phone: codeRegisterForm.phone.trim(),
      code: codeRegisterForm.code.trim(),
    });
    message.value = '注册成功。';
    void router.push(redirectTarget.value);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function submitPasswordRegister(): Promise<void> {
  resetFeedback();

  if (!passwordRegisterForm.phone.trim() || !passwordRegisterForm.password.trim()) {
    error.value = '请输入手机号和密码。';
    return;
  }

  try {
    await authStore.register({
      name: passwordRegisterForm.name.trim(),
      phone: passwordRegisterForm.phone.trim(),
      password: passwordRegisterForm.password,
    });
    message.value = '注册成功。';
    void router.push(redirectTarget.value);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function submitProviderLogin(provider: AuthProvider): Promise<void> {
  resetFeedback();

  try {
    const mockPayload = buildMockProviderPayload(provider);
    await authStore.loginWithProvider({
      provider,
      providerId: mockPayload.providerId,
      displayName: mockPayload.displayName,
    });
    message.value = `${provider === 'wechat' ? '微信' : 'QQ'} 登录成功。`;
    void router.push(redirectTarget.value);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function openBindPhonePage(): void {
  void router.push({
    path: '/auth/bind-phone',
    query: { redirect: '/auth' },
  });
}

async function submitBindProvider(provider: AuthProvider): Promise<void> {
  resetFeedback();

  try {
    const mockPayload = buildMockProviderPayload(provider);
    await authStore.bindProvider({
      provider,
      providerId: mockPayload.providerId,
    });
    message.value = `${provider === 'wechat' ? '微信' : 'QQ'} 绑定成功。`;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function refreshCurrentUser(): Promise<void> {
  resetFeedback();

  try {
    await authStore.refreshCurrentUser();
    message.value = '账号信息已刷新。';
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function logout(): void {
  authStore.logout();
  message.value = '已退出登录。';
  void router.push('/auth');
}

onBeforeUnmount(() => {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }
});
</script>

<style scoped>
.auth-screen {
  overflow-y: auto;
  padding: 18px 16px 42px;
  background:
    radial-gradient(circle at top left, rgba(247, 205, 139, 0.28), transparent 24%),
    radial-gradient(circle at top right, rgba(115, 166, 150, 0.18), transparent 22%),
    linear-gradient(180deg, #f4efe7 0%, #e7eff0 100%);
}

.auth-shell {
  display: grid;
  gap: 18px;
  max-width: 1040px;
  margin: 0 auto;
}

.auth-hero,
.auth-card,
.entry-card {
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(36, 56, 77, 0.08);
  box-shadow: 0 20px 60px rgba(54, 69, 79, 0.12);
}

.auth-hero {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.back-btn,
.switch-link,
.sub-tab,
.entry-card,
.provider-btn,
.primary-btn,
.secondary-btn,
.danger-btn,
.inline-btn {
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.back-btn {
  width: fit-content;
  border: none;
  border-radius: 18px;
  padding: 14px 22px;
  background: #dde6ee;
  color: #23384c;
  font-size: 16px;
  font-weight: 700;
}

.hero-copy h1,
.card-head h2 {
  margin: 0;
  color: #20384e;
  font-size: 42px;
  line-height: 1.05;
}

.eyebrow,
.section-kicker,
.entry-kicker {
  margin: 0 0 8px;
  color: #6a7d8a;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.hero-text,
.provider-note,
.notice-card p {
  margin: 0;
  color: #506474;
  line-height: 1.7;
}

.auth-board {
  display: grid;
  gap: 18px;
}

.entry-panel {
  display: grid;
  gap: 14px;
}

.entry-card {
  border: 1px solid transparent;
  text-align: left;
  padding: 18px;
}

.entry-card strong {
  display: block;
  margin-bottom: 8px;
  color: #20384e;
  font-size: 24px;
}

.entry-card p {
  margin: 0;
  color: #5d6f7d;
  line-height: 1.6;
}

.entry-card.active {
  border-color: rgba(33, 60, 85, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(233, 242, 248, 0.9));
}

.auth-card {
  padding: 22px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.switch-link {
  border: none;
  background: transparent;
  color: #29445b;
  font-size: 15px;
  font-weight: 700;
}

.card-stack,
.summary-grid,
.provider-manage {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: #29445b;
  font-size: 15px;
  font-weight: 700;
}

.field input {
  width: 100%;
  border: 1px solid rgba(36, 56, 77, 0.12);
  border-radius: 20px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.94);
  color: #20384e;
  font-size: 17px;
}

.inline-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.inline-btn {
  border: none;
  border-radius: 18px;
  padding: 0 16px;
  background: #d7e1ea;
  color: #516777;
  font-weight: 700;
}

.sub-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.sub-tab {
  flex: 1;
  border: none;
  border-radius: 18px;
  padding: 14px 16px;
  background: #e4ebf1;
  color: #4c6171;
  font-size: 15px;
  font-weight: 700;
}

.sub-tab.active {
  background: #243c55;
  color: #fff;
}

.notice-card {
  border-radius: 22px;
  padding: 16px;
  background: rgba(242, 246, 249, 0.92);
  border: 1px solid rgba(36, 56, 77, 0.08);
}

.notice-card strong {
  display: block;
  margin-bottom: 6px;
  color: #20384e;
}

.primary-btn,
.secondary-btn,
.danger-btn,
.provider-btn {
  border: none;
  border-radius: 20px;
  padding: 16px 18px;
  font-size: 17px;
  font-weight: 700;
}

.primary-btn {
  background: #243c55;
  color: #fff;
}

.secondary-btn {
  background: #dfe7ee;
  color: #243c55;
}

.danger-btn {
  background: #f5d7d7;
  color: #883f3f;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 14px;
  color: #6b7f8d;
  font-size: 13px;
  letter-spacing: 0.08em;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(36, 56, 77, 0.12);
}

.provider-row,
.action-row {
  display: grid;
  gap: 12px;
}

.provider-btn.wechat {
  background: #d8f0e0;
  color: #1e5f39;
}

.provider-btn.qq {
  background: #dbe9ff;
  color: #214f92;
}

.feedback {
  margin: 14px 0 0;
  border-radius: 18px;
  padding: 14px 16px;
  font-size: 15px;
}

.feedback.success {
  background: rgba(210, 241, 222, 0.9);
  color: #256543;
}

.feedback.error {
  background: rgba(248, 228, 228, 0.94);
  color: #a24a4a;
}

.logged-shell {
  display: grid;
}

.summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 14px;
}

.summary-item {
  border-radius: 22px;
  padding: 16px;
  background: rgba(242, 246, 249, 0.92);
}

.summary-item span {
  display: block;
  margin-bottom: 8px;
  color: #6e808d;
  font-size: 14px;
}

.summary-item strong {
  color: #20384e;
  font-size: 18px;
}

@media (min-width: 900px) {
  .auth-board {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .provider-row,
  .action-row,
  .provider-manage {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .auth-screen {
    padding: 12px 12px 30px;
  }

  .auth-hero,
  .auth-card {
    border-radius: 24px;
    padding: 18px;
  }

  .hero-copy h1,
  .card-head h2 {
    font-size: 34px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .card-head {
    flex-direction: column;
  }

  .inline-field {
    grid-template-columns: 1fr;
  }
}
</style>
