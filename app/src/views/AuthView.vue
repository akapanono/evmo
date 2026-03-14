<template>
  <section class="app-screen is-active auth-screen">
    <div class="auth-shell">
      <template v-if="!authStore.isLoggedIn">
        <article v-if="activeScreen === 'landing'" class="auth-card auth-landing">
          <div class="card-head">
            <button type="button" class="ghost-btn" @click="goBack">返回</button>
            <div>
              <p class="eyebrow">ACCOUNT</p>
              <h1>账号中心</h1>
            </div>
          </div>

          <p class="hero-text">使用账号和密码登录。注册时需要设置 3 个密保问题，用于忘记密码时重置。</p>

          <div class="card-stack">
            <button type="button" class="primary-btn" @click="openLogin">进入登录</button>
            <button type="button" class="secondary-btn" @click="openRegister">创建账号</button>
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
                maxlength="30"
                placeholder="请输入 8-30 位字母或数字"
              />
            </label>

            <label class="field">
              <span>密码</span>
              <input
                v-model="loginForm.password"
                type="password"
                maxlength="15"
                placeholder="请输入密码"
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
              <h1>注册账号</h1>
            </div>
          </div>

          <div class="card-stack">
            <label class="field">
              <span>账号</span>
              <input
                v-model="registerForm.username"
                type="text"
                maxlength="30"
                placeholder="8-30 位字母或数字"
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
                placeholder="请再次输入密码"
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
                  placeholder="例如：你小学的名字是什么？"
                />
              </label>

              <label class="field">
                <span>答案 {{ index + 1 }}</span>
                <input
                  v-model="item.answer"
                  type="text"
                  maxlength="60"
                  placeholder="请输入对应答案"
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
              <h1>找回密码</h1>
            </div>
          </div>

          <div class="card-stack">
            <label class="field">
              <span>账号</span>
              <div class="inline-field">
                <input
                  v-model="resetForm.username"
                  type="text"
                  maxlength="30"
                  placeholder="输入账号后获取密保问题"
                />
                <button type="button" class="inline-btn" :disabled="authStore.loading" @click="loadSecurityQuestions">
                  获取问题
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
                placeholder="请输入新密码"
              />
            </label>

            <label class="field">
              <span>确认新密码</span>
              <input
                v-model="resetForm.confirmNewPassword"
                type="password"
                maxlength="15"
                placeholder="请再次输入新密码"
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
const message = ref('');
const error = ref('');
const resetQuestions = ref<string[]>([]);

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

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' && redirect ? redirect : '/me';
});

function resetFeedback(): void {
  message.value = '';
  error.value = '';
}

function goBack(): void {
  void router.push(redirectTarget.value);
}

function openLogin(): void {
  resetFeedback();
  activeScreen.value = 'login';
}

function openRegister(): void {
  resetFeedback();
  activeScreen.value = 'register';
}

function openForgotPassword(): void {
  resetFeedback();
  activeScreen.value = 'forgot';
}

async function submitLogin(): Promise<void> {
  resetFeedback();

  try {
    await authStore.login({
      username: loginForm.username.trim(),
      password: loginForm.password,
    });
    message.value = '登录成功。';
    void router.push(redirectTarget.value);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function submitRegister(): Promise<void> {
  resetFeedback();

  try {
    await authStore.register({
      username: registerForm.username.trim(),
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
      securityQuestions: registerForm.securityQuestions.map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
    });
    message.value = '注册成功。';
    void router.push(redirectTarget.value);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function loadSecurityQuestions(): Promise<void> {
  resetFeedback();

  try {
    resetQuestions.value = await authStore.getPasswordResetQuestions(resetForm.username.trim());
    resetForm.securityAnswers = ['', '', ''];
    message.value = '密保问题已加载。';
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function submitResetPassword(): Promise<void> {
  resetFeedback();

  try {
    await authStore.resetPassword({
      username: resetForm.username.trim(),
      securityAnswers: resetForm.securityAnswers.map((item) => item.trim()),
      newPassword: resetForm.newPassword,
      confirmNewPassword: resetForm.confirmNewPassword,
    });
    message.value = '密码已重置。';
    void router.push(redirectTarget.value);
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
  activeScreen.value = 'landing';
  resetFeedback();
  void router.push('/auth');
}
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
  max-width: 720px;
  margin: 0 auto;
}

.auth-card {
  border-radius: 28px;
  padding: 22px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(36, 56, 77, 0.08);
  box-shadow: 0 20px 60px rgba(54, 69, 79, 0.12);
}

.auth-landing {
  display: grid;
  gap: 18px;
  min-height: 320px;
  align-content: center;
}

.card-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #6a7d8a;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

h1 {
  margin: 0;
  color: #20384e;
  font-size: 38px;
  line-height: 1.05;
}

.hero-text {
  margin: 0;
  color: #506474;
  line-height: 1.7;
}

.card-stack,
.summary-grid,
.provider-row {
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

.security-block {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: rgba(235, 241, 246, 0.72);
}

.primary-btn,
.secondary-btn,
.danger-btn,
.ghost-btn,
.inline-btn,
.link-btn {
  border: none;
  border-radius: 18px;
  font-weight: 700;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  padding: 16px 18px;
  font-size: 17px;
}

.primary-btn {
  background: #243c55;
  color: #fff;
}

.secondary-btn,
.ghost-btn,
.inline-btn {
  background: #dfe7ee;
  color: #243c55;
}

.danger-btn {
  background: #f5d7d7;
  color: #883f3f;
}

.ghost-btn {
  padding: 12px 18px;
}

.inline-btn {
  padding: 0 16px;
}

.link-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.link-btn {
  padding: 0;
  background: transparent;
  color: #45617a;
}

.summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-item {
  padding: 16px;
  border-radius: 22px;
  background: rgba(235, 241, 246, 0.72);
  display: grid;
  gap: 6px;
}

.summary-item span {
  color: #6a7d8a;
  font-size: 13px;
}

.summary-item strong {
  color: #20384e;
  font-size: 17px;
}

.feedback {
  margin: 18px 0 0;
  border-radius: 18px;
  padding: 14px 16px;
  font-size: 15px;
  line-height: 1.6;
}

.feedback.success {
  color: #24523b;
  background: rgba(205, 235, 216, 0.78);
}

.feedback.error {
  color: #9a4e44;
  background: rgba(255, 226, 223, 0.88);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
  transform: none;
}

@media (max-width: 640px) {
  .auth-screen {
    padding: 14px 12px 34px;
  }

  .auth-card {
    border-radius: 24px;
    padding: 18px;
  }

  h1 {
    font-size: 31px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
