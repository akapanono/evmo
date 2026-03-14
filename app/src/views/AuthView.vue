<template>
  <section class="app-screen is-active auth-screen">
    <div class="auth-shell">
      <template v-if="!authStore.isLoggedIn">
        <article v-if="activeScreen === 'landing'" class="auth-card auth-landing">
          <div class="card-head">
            <button type="button" class="ghost-btn" @click="goBack">返回</button>
            <div>
              <p class="eyebrow">ACCOUNT</p>
              <h1>账号与安全</h1>
            </div>
          </div>

          <p class="hero-text">
            用账号和密码登录。注册时设置 3 个密保问题，忘记密码时可用密保答案重置。
          </p>

          <div class="card-stack">
            <button type="button" class="primary-btn" @click="openLogin">去登录</button>
            <button type="button" class="secondary-btn" @click="openRegister">去注册</button>
          </div>
        </article>

        <article v-else-if="activeScreen === 'login'" class="auth-card">
          <div class="card-head">
            <button type="button" class="ghost-btn" @click="activeScreen = 'landing'">返回</button>
            <div>
              <p class="eyebrow">SIGN IN</p>
              <h1>账号登录</h1>
            </div>
          </div>

          <div class="card-stack">
            <label class="field">
              <span>账号</span>
              <input
                v-model="loginForm.username"
                type="text"
                maxlength="16"
                placeholder="4-16 位字母或数字"
              />
            </label>

            <label class="field">
              <span>密码</span>
              <input
                v-model="loginForm.password"
                type="password"
                maxlength="15"
                placeholder="6-15 位字母或数字"
              />
            </label>

            <button type="button" class="primary-btn" :disabled="authStore.loading" @click="submitLogin">
              {{ authStore.loading ? '登录中...' : '登录' }}
            </button>
          </div>

          <div class="link-row">
            <button type="button" class="link-btn" @click="openForgotPassword">忘记密码</button>
            <button type="button" class="link-btn" @click="openRegister">注册</button>
          </div>

          <p v-if="message" class="feedback success">{{ message }}</p>
          <p v-if="error" class="feedback error">{{ error }}</p>
        </article>

        <article v-else-if="activeScreen === 'register'" class="auth-card">
          <div class="card-head">
            <button type="button" class="ghost-btn" @click="activeScreen = 'login'">返回</button>
            <div>
              <p class="eyebrow">SIGN UP</p>
              <h1>账号注册</h1>
            </div>
          </div>

          <div class="card-stack">
            <label class="field">
              <span>账号</span>
              <input
                v-model="registerForm.username"
                type="text"
                maxlength="16"
                placeholder="4-16 位字母或数字"
              />
            </label>

            <label class="field">
              <span>密码</span>
              <input
                v-model="registerForm.password"
                type="password"
                maxlength="15"
                placeholder="6-15 位字母或数字"
              />
            </label>

            <label class="field">
              <span>确认密码</span>
              <input
                v-model="registerForm.confirmPassword"
                type="password"
                maxlength="15"
                placeholder="再次输入密码"
              />
            </label>

            <div
              v-for="(item, index) in registerForm.securityQuestions"
              :key="`register-question-${index}`"
              class="security-block"
            >
              <label class="field">
                <span>密保问题 {{ index + 1 }}</span>
                <input
                  v-model="item.question"
                  type="text"
                  maxlength="60"
                  placeholder="请输入密保问题"
                />
              </label>

              <label class="field">
                <span>答案 {{ index + 1 }}</span>
                <input
                  v-model="item.answer"
                  type="text"
                  maxlength="60"
                  placeholder="请输入答案"
                />
              </label>
            </div>

            <button type="button" class="primary-btn" :disabled="authStore.loading" @click="submitRegister">
              {{ authStore.loading ? '注册中...' : '注册并登录' }}
            </button>
          </div>

          <p v-if="message" class="feedback success">{{ message }}</p>
          <p v-if="error" class="feedback error">{{ error }}</p>
        </article>

        <article v-else class="auth-card">
          <div class="card-head">
            <button type="button" class="ghost-btn" @click="activeScreen = 'login'">返回</button>
            <div>
              <p class="eyebrow">RESET</p>
              <h1>重置密码</h1>
            </div>
          </div>

          <div class="card-stack">
            <label class="field">
              <span>账号</span>
              <div class="inline-field">
                <input
                  v-model="resetForm.username"
                  type="text"
                  maxlength="16"
                  placeholder="输入账号后读取密保问题"
                />
                <button type="button" class="inline-btn" :disabled="authStore.loading" @click="loadSecurityQuestions">
                  读取问题
                </button>
              </div>
            </label>

            <div
              v-for="(question, index) in resetQuestions"
              :key="`reset-question-${index}`"
              class="security-block"
            >
              <label class="field">
                <span>密保问题 {{ index + 1 }}</span>
                <input :value="question" type="text" readonly />
              </label>

              <label class="field">
                <span>答案 {{ index + 1 }}</span>
                <input
                  v-model="resetForm.securityAnswers[index]"
                  type="text"
                  maxlength="60"
                  placeholder="请输入答案"
                />
              </label>
            </div>

            <label class="field">
              <span>新密码</span>
              <input
                v-model="resetForm.newPassword"
                type="password"
                maxlength="15"
                placeholder="6-15 位字母或数字"
              />
            </label>

            <label class="field">
              <span>确认新密码</span>
              <input
                v-model="resetForm.confirmNewPassword"
                type="password"
                maxlength="15"
                placeholder="再次输入新密码"
              />
            </label>

            <button type="button" class="primary-btn" :disabled="authStore.loading" @click="submitResetPassword">
              {{ authStore.loading ? '提交中...' : '重置密码并登录' }}
            </button>
          </div>

          <p v-if="message" class="feedback success">{{ message }}</p>
          <p v-if="error" class="feedback error">{{ error }}</p>
        </article>
      </template>

      <template v-else>
        <article class="auth-card">
          <div class="card-head">
            <button type="button" class="ghost-btn" @click="goBack">返回</button>
            <div>
              <p class="eyebrow">ACCOUNT READY</p>
              <h1>{{ authStore.user?.username || authStore.user?.name || '已登录' }}</h1>
            </div>
            <button type="button" class="ghost-btn" @click="refreshCurrentUser">刷新</button>
          </div>

          <div class="summary-grid">
            <div class="summary-item">
              <span>账号</span>
              <strong>{{ authStore.user?.username || '--' }}</strong>
            </div>
            <div class="summary-item">
              <span>密码状态</span>
              <strong>{{ authStore.user?.hasPassword ? '已设置' : '未设置' }}</strong>
            </div>
          </div>

          <div class="provider-row">
            <button type="button" class="danger-btn" @click="logout">退出登录</button>
          </div>

          <p v-if="message" class="feedback success">{{ message }}</p>
          <p v-if="error" class="feedback error">{{ error }}</p>
        </article>
      </template>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

type AuthScreen = 'landing' | 'login' | 'register' | 'forgot';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const activeScreen = ref<AuthScreen>('landing');
const error = ref('');
const message = ref('');
const resetQuestions = ref<string[]>([]);
const fallbackBackTarget = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect.trim() : '';
  return redirect || '/me';
});

const loginForm = reactive({
  username: '',
  password: '',
});

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  securityQuestions: [
    { question: '', answer: '' },
    { question: '', answer: '' },
    { question: '', answer: '' },
  ],
});

const resetForm = reactive({
  username: '',
  securityAnswers: ['', '', ''],
  newPassword: '',
  confirmNewPassword: '',
});

const canGoBack = computed(() => window.history.length > 1);

function resetFeedback(): void {
  error.value = '';
  message.value = '';
}

function resetRegisterForm(): void {
  registerForm.username = '';
  registerForm.password = '';
  registerForm.confirmPassword = '';
  registerForm.securityQuestions.forEach((item) => {
    item.question = '';
    item.answer = '';
  });
}

function resetResetForm(): void {
  resetForm.username = '';
  resetForm.securityAnswers = ['', '', ''];
  resetForm.newPassword = '';
  resetForm.confirmNewPassword = '';
  resetQuestions.value = [];
}

function openLogin(): void {
  resetFeedback();
  activeScreen.value = 'login';
}

function openRegister(): void {
  resetFeedback();
  resetRegisterForm();
  activeScreen.value = 'register';
}

function openForgotPassword(): void {
  resetFeedback();
  resetResetForm();
  activeScreen.value = 'forgot';
}

function goBack(): void {
  if (canGoBack.value) {
    router.back();
    return;
  }

  router.replace(fallbackBackTarget.value);
}

async function submitLogin(): Promise<void> {
  resetFeedback();
  try {
    await authStore.login({
      username: loginForm.username,
      password: loginForm.password,
    });
    message.value = '登录成功';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败';
  }
}

async function submitRegister(): Promise<void> {
  resetFeedback();
  try {
    await authStore.register({
      username: registerForm.username,
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
      securityQuestions: registerForm.securityQuestions.map((item) => ({
        question: item.question,
        answer: item.answer,
      })),
    });
    message.value = '注册成功';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '注册失败';
  }
}

async function loadSecurityQuestions(): Promise<void> {
  resetFeedback();
  try {
    resetQuestions.value = await authStore.getPasswordResetQuestions(resetForm.username);
    message.value = '已加载密保问题';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取失败';
  }
}

async function submitResetPassword(): Promise<void> {
  resetFeedback();
  try {
    await authStore.resetPassword({
      username: resetForm.username,
      securityAnswers: [...resetForm.securityAnswers],
      newPassword: resetForm.newPassword,
      confirmNewPassword: resetForm.confirmNewPassword,
    });
    message.value = '密码已重置';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '重置失败';
  }
}

async function refreshCurrentUser(): Promise<void> {
  resetFeedback();
  try {
    await authStore.refreshCurrentUser();
    message.value = '已刷新';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '刷新失败';
  }
}

function logout(): void {
  authStore.logout();
  resetFeedback();
  activeScreen.value = 'landing';
}

if (route.query.mode === 'register') {
  activeScreen.value = 'register';
} else if (route.query.mode === 'forgot') {
  activeScreen.value = 'forgot';
} else if (route.query.mode === 'login') {
  activeScreen.value = 'login';
}
</script>

<style scoped>
.auth-screen {
  padding: 24px 16px 40px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--gold) 16%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--body-grad-start) 94%, var(--paper)) 0%, var(--paper) 100%);
}

.auth-shell {
  display: grid;
  gap: 18px;
}

.auth-card {
  display: grid;
  gap: 18px;
  padding: 22px 18px;
  border-radius: 28px;
  background: color-mix(in srgb, var(--card-soft) 96%, transparent);
  border: 1px solid var(--line);
  box-shadow: 0 18px 42px var(--nav-shadow);
}

.auth-landing {
  gap: 22px;
}

.card-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 12px;
}

.card-head h1 {
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 34px;
  line-height: 1.08;
}

.eyebrow {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-text {
  margin: 0;
  color: var(--muted);
  line-height: 1.75;
}

.card-stack {
  display: grid;
  gap: 14px;
}

.field,
.security-block {
  display: grid;
  gap: 8px;
}

.field span {
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 600;
}

.field input,
.inline-field input {
  width: 100%;
  min-height: 54px;
  padding: 0 16px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper) 88%, transparent);
  color: var(--ink);
  font-size: 17px;
}

.field input[readonly] {
  color: var(--muted);
  background: color-mix(in srgb, var(--surface-2) 88%, transparent);
}

.inline-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.ghost-btn,
.inline-btn,
.primary-btn,
.secondary-btn,
.link-btn,
.danger-btn {
  border: 0;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
}

.ghost-btn,
.inline-btn,
.link-btn {
  background: color-mix(in srgb, var(--paper) 84%, transparent);
  color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--line);
}

.ghost-btn {
  min-height: 44px;
  padding: 0 14px;
}

.inline-btn {
  min-width: 88px;
  min-height: 54px;
  padding: 0 14px;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  min-height: 54px;
  padding: 0 18px;
}

.primary-btn {
  background: var(--ink);
  color: var(--paper);
}

.secondary-btn {
  background: color-mix(in srgb, var(--teal) 14%, var(--paper));
  color: color-mix(in srgb, var(--ink) 88%, var(--teal));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--teal) 20%, transparent);
}

.danger-btn {
  background: color-mix(in srgb, var(--coral) 20%, var(--paper));
  color: color-mix(in srgb, var(--coral) 88%, var(--ink));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--coral) 22%, transparent);
}

.link-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.link-btn {
  min-height: 42px;
  padding: 0 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  display: grid;
  gap: 4px;
  padding: 16px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--paper) 84%, transparent);
  border: 1px solid var(--line);
}

.summary-item span {
  color: var(--muted);
  font-size: 13px;
}

.summary-item strong {
  color: var(--ink);
  font-size: 24px;
  line-height: 1.15;
}

.provider-row {
  display: flex;
  justify-content: flex-start;
}

.feedback {
  margin: 0;
  padding: 12px 14px;
  border-radius: 16px;
  line-height: 1.6;
}

.feedback.success {
  background: color-mix(in srgb, var(--teal) 14%, var(--paper));
  color: color-mix(in srgb, var(--teal) 88%, var(--ink));
}

.feedback.error {
  background: color-mix(in srgb, var(--coral) 14%, var(--paper));
  color: color-mix(in srgb, var(--coral) 86%, var(--ink));
}

@media (max-width: 520px) {
  .card-head {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .inline-field {
    grid-template-columns: 1fr;
  }

  .link-row {
    flex-wrap: wrap;
  }
}
</style>

