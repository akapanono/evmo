<template>
  <section class="app-screen is-active auth-screen">
    <div class="auth-shell">
      <header class="hero-panel">
        <button type="button" class="back-btn" @click="goBack">返回</button>
        <div class="hero-copy">
          <p class="eyebrow">Account Center</p>
          <h1>账号与安全</h1>
          <p class="hero-text">
            登录、绑定和账号保护统一放在这里。界面按正式 App 的账号中心方式重做了，重点突出状态、入口和操作层级。
          </p>
          <div class="hero-tags">
            <span>手机号登录</span>
            <span>短信验证码绑定</span>
            <span>微信 / QQ 授权</span>
          </div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <strong>{{ authStore.isLoggedIn ? '已登录' : '未登录' }}</strong>
            <span>当前状态</span>
          </div>
          <div class="hero-stat">
            <strong>{{ authStore.user?.phone ? '已绑定' : '待绑定' }}</strong>
            <span>手机号</span>
          </div>
          <div class="hero-stat">
            <strong>{{ providerBoundCount }}</strong>
            <span>第三方账号</span>
          </div>
        </div>
      </header>

      <template v-if="!authStore.isLoggedIn">
        <section class="auth-grid">
          <article class="surface-card main-card">
            <div class="tab-row">
              <button
                v-for="item in authTabs"
                :key="item.value"
                type="button"
                :class="['tab-btn', { active: activeTab === item.value }]"
                @click="activeTab = item.value"
              >
                {{ item.label }}
              </button>
            </div>

            <div v-if="activeTab === 'login'" class="card-stack">
              <div class="section-head">
                <div>
                  <p class="section-kicker">Quick Access</p>
                  <h2>手机号登录</h2>
                </div>
                <span class="section-pill">常用方式</span>
              </div>
              <label class="field">
                <span>手机号</span>
                <input v-model="phoneForm.phone" type="text" inputmode="numeric" placeholder="请输入手机号" />
              </label>
              <label class="field">
                <span>密码</span>
                <input v-model="phoneForm.password" type="password" placeholder="请输入密码" />
              </label>
              <button type="button" class="primary-btn" :disabled="authStore.loading" @click="submitPhoneLogin">
                {{ authStore.loading ? '登录中...' : '立即登录' }}
              </button>
            </div>

            <div v-else-if="activeTab === 'register'" class="card-stack">
              <div class="section-head">
                <div>
                  <p class="section-kicker">New Account</p>
                  <h2>创建账号</h2>
                </div>
                <span class="section-pill alt">新用户</span>
              </div>
              <label class="field">
                <span>昵称</span>
                <input v-model="registerForm.name" type="text" placeholder="请输入昵称" />
              </label>
              <label class="field">
                <span>手机号</span>
                <input v-model="registerForm.phone" type="text" inputmode="numeric" placeholder="请输入手机号" />
              </label>
              <label class="field">
                <span>密码</span>
                <input v-model="registerForm.password" type="password" placeholder="请设置密码" />
              </label>
              <button type="button" class="primary-btn" :disabled="authStore.loading" @click="submitRegister">
                {{ authStore.loading ? '注册中...' : '创建账号' }}
              </button>
            </div>

            <div v-else class="card-stack">
              <div class="section-head">
                <div>
                  <p class="section-kicker">Authorized Access</p>
                  <h2>第三方授权登录</h2>
                </div>
                <span class="section-pill alt">免输账号</span>
              </div>
              <div class="provider-grid">
                <article class="provider-tile provider-tile--wechat">
                  <div class="provider-top">
                    <div class="provider-icon">微</div>
                    <div>
                      <strong>微信登录</strong>
                      <p>适合日常使用，授权后可以继续绑定手机号。</p>
                    </div>
                  </div>
                  <button type="button" class="secondary-btn provider-btn" :disabled="authStore.loading" @click="submitProviderLogin('wechat')">
                    {{ authStore.loading ? '授权中...' : '继续微信授权' }}
                  </button>
                </article>

                <article class="provider-tile provider-tile--qq">
                  <div class="provider-top">
                    <div class="provider-icon">Q</div>
                    <div>
                      <strong>QQ 登录</strong>
                      <p>适合保留原社交身份，授权后同样可绑定手机号。</p>
                    </div>
                  </div>
                  <button type="button" class="secondary-btn provider-btn" :disabled="authStore.loading" @click="submitProviderLogin('qq')">
                    {{ authStore.loading ? '授权中...' : '继续 QQ 授权' }}
                  </button>
                </article>
              </div>
            </div>

            <p v-if="message" class="feedback success">{{ message }}</p>
            <p v-if="error" class="feedback error">{{ error }}</p>
          </article>

          <aside class="side-stack">
            <article class="surface-card info-card">
              <p class="eyebrow">Flow</p>
              <h3>推荐使用方式</h3>
              <div class="step-list">
                <div class="step-item">
                  <span class="step-index">01</span>
                  <div>
                    <strong>先登录</strong>
                    <p>手机号或第三方账号任选其一。</p>
                  </div>
                </div>
                <div class="step-item">
                  <span class="step-index">02</span>
                  <div>
                    <strong>再绑定</strong>
                    <p>登录后再补齐手机号和第三方账号。</p>
                  </div>
                </div>
                <div class="step-item">
                  <span class="step-index">03</span>
                  <div>
                    <strong>统一使用</strong>
                    <p>好友、纪念日、推荐和备份都会归到同一个账号下。</p>
                  </div>
                </div>
              </div>
            </article>

            <article class="surface-card note-card">
              <p class="eyebrow">Current Mode</p>
              <h3>接入说明</h3>
              <p>当前微信 / QQ 使用项目内模拟授权流程，后面替换成真实开放平台 SDK 时，不需要重做界面结构。</p>
            </article>
          </aside>
        </section>
      </template>

      <template v-else>
        <section class="auth-grid logged-grid">
          <article class="surface-card profile-card">
            <div class="profile-layout">
              <div class="profile-top">
                <div class="profile-avatar">{{ displayInitial }}</div>
                <div>
                  <p class="eyebrow">Current User</p>
                  <h2>{{ authStore.user?.name || '当前账号' }}</h2>
                  <p class="profile-subtitle">{{ authStore.user?.phone || '未绑定手机号' }}</p>
                </div>
              </div>

              <div class="profile-summary">
                <p class="summary-label">账号概览</p>
                <p class="summary-text">当前账号的登录方式、绑定状态和安全设置都集中展示在这里，下面再进入手机号和第三方账号的具体管理。</p>
              </div>
            </div>

            <div class="status-grid">
              <div class="status-card">
                <span>手机号</span>
                <strong>{{ authStore.user?.phone ? '已绑定' : '未绑定' }}</strong>
              </div>
              <div class="status-card">
                <span>微信</span>
                <strong>{{ authStore.user?.bindings.wechat ? '已绑定' : '未绑定' }}</strong>
              </div>
              <div class="status-card">
                <span>QQ</span>
                <strong>{{ authStore.user?.bindings.qq ? '已绑定' : '未绑定' }}</strong>
              </div>
              <div class="status-card">
                <span>密码</span>
                <strong>{{ authStore.user?.hasPassword ? '已设置' : '未设置' }}</strong>
              </div>
            </div>

            <div class="action-row">
              <button type="button" class="ghost-btn" @click="refreshCurrentUser">刷新状态</button>
              <button type="button" class="danger-btn" @click="logout">退出登录</button>
            </div>
          </article>

          <div class="management-stack">
            <article class="surface-card phone-card">
              <div class="phone-card-main">
                <div class="section-head">
                  <div>
                    <p class="section-kicker">Phone Binding</p>
                    <h2>绑定手机号</h2>
                  </div>
                  <span class="section-pill">验证码</span>
                </div>
                <p class="block-copy">进入独立的短信验证码页面完成绑定，这样更接近真实移动端的操作方式。</p>
              </div>
              <button type="button" class="primary-btn phone-action" @click="openBindPhonePage">前往绑定手机号</button>
            </article>

            <article class="surface-card provider-card">
            <div class="section-head">
              <div>
                <p class="section-kicker">Third-Party Access</p>
                <h2>第三方账号绑定</h2>
              </div>
              <span class="section-pill alt">授权入口</span>
            </div>

            <div class="provider-grid">
              <article class="provider-tile provider-tile--wechat">
                <div class="provider-top">
                  <div class="provider-icon">微</div>
                  <div>
                    <strong>微信</strong>
                    <p>{{ authStore.user?.bindings.wechat ? '当前账号已绑定微信，可直接使用微信登录。' : '点击按钮后直接进入微信授权流程。' }}</p>
                  </div>
                </div>
                <div class="action-row">
                  <button type="button" class="secondary-btn provider-btn" :disabled="authStore.loading || authStore.user?.bindings.wechat" @click="submitBindProvider('wechat')">
                    {{ authStore.user?.bindings.wechat ? '已绑定微信' : '绑定微信' }}
                  </button>
                  <button
                    type="button"
                    class="ghost-btn provider-btn"
                    :disabled="authStore.loading || !authStore.user?.bindings.wechat"
                    @click="submitUnbindProvider('wechat')"
                  >
                    解绑微信
                  </button>
                </div>
              </article>

              <article class="provider-tile provider-tile--qq">
                <div class="provider-top">
                  <div class="provider-icon">Q</div>
                  <div>
                    <strong>QQ</strong>
                    <p>{{ authStore.user?.bindings.qq ? '当前账号已绑定 QQ，可直接使用 QQ 登录。' : '点击按钮后直接进入 QQ 授权流程。' }}</p>
                  </div>
                </div>
                <div class="action-row">
                  <button type="button" class="secondary-btn provider-btn" :disabled="authStore.loading || authStore.user?.bindings.qq" @click="submitBindProvider('qq')">
                    {{ authStore.user?.bindings.qq ? '已绑定 QQ' : '绑定 QQ' }}
                  </button>
                  <button
                    type="button"
                    class="ghost-btn provider-btn"
                    :disabled="authStore.loading || !authStore.user?.bindings.qq"
                    @click="submitUnbindProvider('qq')"
                  >
                    解绑 QQ
                  </button>
                </div>
              </article>
            </div>

              <p class="soft-note">当前仍是项目内模拟授权流程，但交互已经改成正式 App 常见的按钮授权结构。</p>
            </article>
          </div>

          <p v-if="message" class="feedback success">{{ message }}</p>
          <p v-if="error" class="feedback error">{{ error }}</p>
        </section>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { AuthProvider } from '@/types/auth';

type AuthTab = 'login' | 'register' | 'provider';

const authTabs = [
  { value: 'login', label: '手机号登录' },
  { value: 'register', label: '注册账号' },
  { value: 'provider', label: '微信 / QQ 登录' },
] as const;

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref<AuthTab>('login');
const message = ref('');
const error = ref('');

const phoneForm = reactive({
  phone: '',
  password: '',
});

const registerForm = reactive({
  name: '',
  phone: '',
  password: '',
});

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' && redirect ? redirect : '/me';
});

const displayInitial = computed(() => {
  const name = authStore.user?.name?.trim();
  return name ? name.slice(0, 1) : '我';
});

const providerBoundCount = computed(() => {
  let count = 0;
  if (authStore.user?.bindings.wechat) {
    count += 1;
  }
  if (authStore.user?.bindings.qq) {
    count += 1;
  }
  return `${count}/2`;
});

function resetFeedback(): void {
  message.value = '';
  error.value = '';
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

async function submitPhoneLogin(): Promise<void> {
  resetFeedback();

  if (!phoneForm.phone.trim() || !phoneForm.password.trim()) {
    error.value = '请输入手机号和密码。';
    return;
  }

  try {
    await authStore.login({
      phone: phoneForm.phone.trim(),
      password: phoneForm.password,
    });
    message.value = '登录成功。';
    void router.push(redirectTarget.value);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function submitRegister(): Promise<void> {
  resetFeedback();

  if (!registerForm.phone.trim() || !registerForm.password.trim()) {
    error.value = '请输入手机号和密码。';
    return;
  }

  try {
    await authStore.register({
      name: registerForm.name.trim(),
      phone: registerForm.phone.trim(),
      password: registerForm.password,
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
    message.value = `${provider === 'wechat' ? '微信' : 'QQ'}授权登录成功。`;
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
    message.value = `${provider === 'wechat' ? '微信' : 'QQ'}绑定成功。`;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function submitUnbindProvider(provider: AuthProvider): Promise<void> {
  resetFeedback();

  try {
    await authStore.unbindProvider(provider);
    message.value = `${provider === 'wechat' ? '微信' : 'QQ'}解绑成功。`;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function refreshCurrentUser(): Promise<void> {
  resetFeedback();

  try {
    await authStore.refreshCurrentUser();
    message.value = '账号状态已刷新。';
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function logout(): void {
  authStore.logout();
  message.value = '已退出登录。';
  void router.push('/auth');
}
</script>

<style scoped>
.auth-screen {
  overflow-y: auto;
  padding: 18px 16px 42px;
  background:
    radial-gradient(circle at 10% 10%, rgba(215, 181, 120, .22), transparent 22%),
    radial-gradient(circle at 90% 18%, rgba(104, 152, 137, .18), transparent 20%),
    linear-gradient(180deg, #f4f0e8 0%, #e6ede6 100%);
}

.auth-shell,
.auth-grid,
.side-stack,
.card-stack,
.provider-grid,
.step-list,
.status-grid {
  display: grid;
  gap: 18px;
}

.auth-shell {
  max-width: 1140px;
  margin: 0 auto;
}

.hero-panel,
.surface-card,
.provider-tile {
  border-radius: 30px;
  border: 1px solid rgba(47, 54, 42, .08);
  box-shadow: 0 22px 50px rgba(53, 58, 50, .08);
}

.hero-panel {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 22px;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(255, 250, 240, .92), rgba(234, 242, 235, .92)),
    linear-gradient(135deg, #efe4cf, #dfe9df);
}

.hero-panel::before,
.hero-panel::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.hero-panel::before {
  top: -36px;
  right: -18px;
  width: 170px;
  height: 170px;
  background: radial-gradient(circle, rgba(211, 167, 92, .28), transparent 70%);
}

.hero-panel::after {
  bottom: -56px;
  left: -24px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(100, 146, 132, .18), transparent 72%);
}

.hero-copy,
.surface-card {
  position: relative;
  z-index: 1;
}

.hero-copy {
  max-width: 700px;
}

.eyebrow,
.section-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #6e7467;
}

.hero-copy h1,
.section-head h2,
.profile-top h2,
.info-card h3,
.note-card h3 {
  margin: 0;
  color: #163126;
}

.hero-copy h1 {
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1.04;
}

.hero-text,
.block-copy,
.provider-top p,
.step-item p,
.soft-note,
.profile-subtitle,
.note-card p {
  margin: 0;
  color: #617066;
  line-height: 1.6;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.hero-tags span,
.section-pill,
.hero-stat,
.status-card,
.step-item {
  background: rgba(255, 255, 255, .68);
  border: 1px solid rgba(47, 54, 42, .08);
}

.hero-tags span {
  padding: 10px 14px;
  border-radius: 999px;
  color: #23382d;
  font-size: 13px;
}

.hero-stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.hero-stat {
  border-radius: 22px;
  padding: 16px 18px;
  display: grid;
  gap: 6px;
}

.hero-stat strong {
  color: #163126;
  font-size: 20px;
}

.hero-stat span {
  color: #697565;
  font-size: 13px;
}

.surface-card {
  padding: 22px;
  background: rgba(255, 252, 246, .82);
  backdrop-filter: blur(16px);
}

.auth-grid {
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, .88fr);
  align-items: start;
}

.logged-grid {
  grid-template-columns: 1fr;
  max-width: 980px;
  margin: 0 auto;
}

.management-stack {
  display: grid;
  gap: 18px;
}

.tab-row,
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.back-btn,
.tab-btn,
.primary-btn,
.secondary-btn,
.ghost-btn,
.danger-btn {
  border: 0;
  border-radius: 18px;
  font: inherit;
  transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease;
}

.back-btn:hover,
.tab-btn:hover,
.primary-btn:hover,
.secondary-btn:hover,
.ghost-btn:hover,
.danger-btn:hover {
  transform: translateY(-1px);
}

.back-btn {
  justify-self: start;
  min-width: 78px;
  min-height: 42px;
  padding: 0 16px;
  background: rgba(255, 255, 255, .7);
  color: #1d342b;
}

.tab-btn {
  min-height: 44px;
  padding: 0 16px;
  background: #edf0e8;
  color: #425346;
}

.tab-btn.active {
  background: linear-gradient(135deg, #183228, #284338);
  color: #f5f1e8;
  box-shadow: 0 14px 28px rgba(24, 50, 40, .16);
}

.primary-btn,
.secondary-btn,
.ghost-btn,
.danger-btn {
  min-height: 48px;
  padding: 0 18px;
}

.primary-btn {
  background: linear-gradient(135deg, #183228, #315043);
  color: #f6f2ea;
  box-shadow: 0 14px 28px rgba(24, 50, 40, .16);
}

.secondary-btn {
  background: linear-gradient(135deg, #efe1c3, #e7efe5);
  color: #20362c;
}

.ghost-btn {
  background: #eef1eb;
  color: #34453a;
}

.danger-btn {
  background: linear-gradient(135deg, #8b4234, #6f2a20);
  color: #fff6f2;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
}

.section-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  color: #3b4b40;
  font-size: 12px;
}

.section-pill.alt {
  background: rgba(224, 239, 228, .92);
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: #24372e;
  font-size: 13px;
}

.field input {
  width: 100%;
  min-height: 52px;
  border-radius: 18px;
  border: 1px solid rgba(43, 52, 42, .1);
  padding: 0 16px;
  background: rgba(255, 255, 255, .78);
  color: #22352c;
  font: inherit;
}

.field input:focus {
  outline: none;
  border-color: rgba(61, 107, 89, .42);
  box-shadow: 0 0 0 4px rgba(92, 138, 118, .12);
}

.provider-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.provider-tile {
  padding: 18px;
  display: grid;
  gap: 16px;
}

.provider-tile--wechat {
  background: linear-gradient(180deg, rgba(227, 243, 231, .94), rgba(255, 252, 246, .88));
}

.provider-tile--qq {
  background: linear-gradient(180deg, rgba(228, 236, 250, .96), rgba(255, 252, 246, .88));
}

.provider-top {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.provider-top strong {
  display: block;
  margin-bottom: 4px;
  color: #173127;
}

.provider-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, .82);
  color: #183228;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(46, 58, 47, .08);
}

.provider-btn {
  width: 100%;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(240px, .9fr);
  gap: 18px;
  align-items: center;
}

.profile-avatar {
  width: 74px;
  height: 74px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #d8b06b, #67988b);
  color: #143127;
  font-size: 28px;
  font-weight: 700;
  box-shadow: 0 16px 30px rgba(103, 152, 139, .2);
}

.profile-summary {
  padding: 18px 20px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(232, 239, 232, .92), rgba(255, 255, 255, .72));
  border: 1px solid rgba(47, 54, 42, .08);
}

.summary-label {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #6e7467;
}

.summary-text {
  margin: 0;
  color: #4f6156;
  line-height: 1.7;
}

.status-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.status-card {
  border-radius: 22px;
  padding: 16px;
  display: grid;
  gap: 6px;
}

.status-card span {
  color: #708072;
  font-size: 12px;
}

.status-card strong {
  color: #173127;
  font-size: 24px;
}

.phone-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
}

.phone-card-main {
  display: grid;
  gap: 10px;
}

.phone-action {
  min-width: 220px;
}

.step-list {
  gap: 12px;
}

.step-item {
  border-radius: 24px;
  padding: 16px;
  display: grid;
  grid-template-columns: 54px 1fr;
  gap: 12px;
  align-items: start;
}

.step-index {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #183228, #315043);
  color: #f6f2ea;
  font-weight: 700;
  letter-spacing: .04em;
}

.step-item strong {
  display: block;
  margin-bottom: 4px;
  color: #173127;
}

.soft-note {
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(240, 244, 237, .9);
}

.feedback {
  margin: 0;
  padding: 14px 16px;
  border-radius: 18px;
}

.feedback.success {
  background: #e7f4ec;
  color: #246245;
}

.feedback.error {
  background: #fce7e5;
  color: #8b3c34;
}

@media (max-width: 920px) {
  .auth-grid,
  .logged-grid {
    grid-template-columns: 1fr;
  }

  .profile-layout,
  .phone-card {
    grid-template-columns: 1fr;
  }

  .phone-action {
    min-width: 0;
    width: 100%;
  }
}

@media (max-width: 640px) {
  .auth-screen {
    padding-inline: 12px;
  }

  .hero-panel,
  .surface-card {
    padding: 18px;
    border-radius: 24px;
  }

  .hero-stats,
  .provider-grid,
  .status-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    grid-template-columns: 1fr;
  }

  .step-item {
    grid-template-columns: 1fr;
  }

  .step-index {
    width: 46px;
    height: 46px;
    border-radius: 14px;
  }

  .action-row {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
