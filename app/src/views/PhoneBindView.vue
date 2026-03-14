<template>
  <section class="app-screen is-active bind-screen">
    <div class="bind-shell">
      <header class="bind-hero">
        <button type="button" class="back-btn" @click="goBack">返回</button>
        <div class="hero-copy">
          <p class="eyebrow">Phone Verification</p>
          <h1>绑定手机号</h1>
          <p class="hero-text">通过短信验证码完成绑定。流程保留独立页面，交互更像正式 App 的验证步骤。</p>
        </div>
        <div class="hero-badges">
          <span>验证码有效 5 分钟</span>
          <span>支持重复发送</span>
          <span>测试环境可见验证码</span>
        </div>
      </header>

      <section class="bind-grid">
        <article class="surface-card form-card">
          <div class="section-head">
            <div>
              <p class="section-kicker">Step 1</p>
              <h2>获取验证码</h2>
            </div>
            <span class="section-pill">短信校验</span>
          </div>

          <label class="field">
            <span>手机号</span>
            <input v-model="phone" type="text" inputmode="numeric" placeholder="请输入手机号" />
          </label>

          <div class="code-row">
            <label class="field code-field">
              <span>验证码</span>
              <input v-model="code" type="text" inputmode="numeric" maxlength="6" placeholder="请输入 6 位验证码" />
            </label>
            <button type="button" class="secondary-btn code-btn" :disabled="sending || countdown > 0" @click="sendCode">
              {{ sending ? '发送中...' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
            </button>
          </div>

          <div v-if="devCode" class="dev-card">
            <div>
              <strong>测试验证码</strong>
              <p>正式环境可以去掉这块，直接接短信服务。</p>
            </div>
            <span>{{ devCode }}</span>
          </div>

          <button type="button" class="primary-btn" :disabled="authStore.loading" @click="submitBindPhone">
            {{ authStore.loading ? '绑定中...' : '完成绑定' }}
          </button>

          <p v-if="message" class="feedback success">{{ message }}</p>
          <p v-if="error" class="feedback error">{{ error }}</p>
        </article>

        <aside class="side-stack">
          <article class="surface-card tips-card">
            <p class="eyebrow">Guide</p>
            <h3>绑定说明</h3>
            <div class="tips-list">
              <div class="tip-item">
                <span class="tip-index">01</span>
                <p>先输入手机号，再点击“获取验证码”。</p>
              </div>
              <div class="tip-item">
                <span class="tip-index">02</span>
                <p>收到验证码后填入页面，完成绑定。</p>
              </div>
              <div class="tip-item">
                <span class="tip-index">03</span>
                <p>绑定成功后会自动回到账号与安全页。</p>
              </div>
            </div>
          </article>

          <article class="surface-card note-card">
            <p class="eyebrow">Current Mode</p>
            <h3>测试环境提示</h3>
            <p>当前版本会把验证码直接显示在页面上，方便你本地验证流程。后面接真实短信服务时，只保留发送和校验接口即可。</p>
          </article>
        </aside>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { cloudService } from '@/services/cloudService';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const phone = ref(authStore.user?.phone || '');
const code = ref('');
const sending = ref(false);
const countdown = ref(0);
const devCode = ref('');
const message = ref('');
const error = ref('');

let countdownTimer: ReturnType<typeof window.setInterval> | null = null;

function resetFeedback(): void {
  message.value = '';
  error.value = '';
}

function startCountdown(): void {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }

  countdown.value = 60;
  countdownTimer = window.setInterval(() => {
    if (countdown.value <= 1) {
      if (countdownTimer) {
        window.clearInterval(countdownTimer);
      }
      countdownTimer = null;
      countdown.value = 0;
      return;
    }

    countdown.value -= 1;
  }, 1000);
}

async function sendCode(): Promise<void> {
  resetFeedback();

  if (!phone.value.trim()) {
    error.value = '请输入手机号。';
    return;
  }

  sending.value = true;
  try {
    const result = await cloudService.sendBindPhoneCode(phone.value.trim());
    devCode.value = result.devCode || '';
    message.value = `验证码已发送到 ${result.maskedPhone}。`;
    startCountdown();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    sending.value = false;
  }
}

async function submitBindPhone(): Promise<void> {
  resetFeedback();

  if (!phone.value.trim() || !code.value.trim()) {
    error.value = '请输入手机号和验证码。';
    return;
  }

  try {
    await authStore.bindPhoneWithCode({
      phone: phone.value.trim(),
      code: code.value.trim(),
    });
    message.value = '手机号绑定成功。';
    window.setTimeout(() => {
      void router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/auth');
    }, 400);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function goBack(): void {
  void router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/auth');
}

onBeforeUnmount(() => {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }
});
</script>

<style scoped>
.bind-screen {
  overflow-y: auto;
  padding: 18px 16px 42px;
  background:
    radial-gradient(circle at 86% 10%, rgba(215, 181, 120, .22), transparent 24%),
    radial-gradient(circle at 12% 16%, rgba(104, 152, 137, .16), transparent 20%),
    linear-gradient(180deg, #f4efe7 0%, #e5ece5 100%);
}

.bind-shell,
.bind-grid,
.side-stack,
.tips-list {
  display: grid;
  gap: 18px;
}

.bind-shell {
  max-width: 1080px;
  margin: 0 auto;
}

.bind-hero,
.surface-card,
.tip-item {
  border-radius: 30px;
  border: 1px solid rgba(47, 54, 42, .08);
  box-shadow: 0 22px 50px rgba(53, 58, 50, .08);
}

.bind-hero {
  display: grid;
  gap: 18px;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(255, 251, 244, .92), rgba(236, 244, 237, .92)),
    linear-gradient(135deg, #efe4cf, #dfe9df);
}

.hero-copy h1,
.section-head h2,
.tips-card h3,
.note-card h3 {
  margin: 0;
  color: #173127;
}

.eyebrow,
.section-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #6e7467;
}

.hero-text,
.tip-item p,
.note-card p {
  margin: 0;
  color: #627066;
  line-height: 1.6;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-badges span,
.section-pill,
.tip-item {
  background: rgba(255, 255, 255, .7);
  border: 1px solid rgba(47, 54, 42, .08);
}

.hero-badges span {
  padding: 10px 14px;
  border-radius: 999px;
  color: #20362c;
  font-size: 13px;
}

.bind-grid {
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr);
  align-items: start;
}

.surface-card {
  padding: 22px;
  background: rgba(255, 252, 246, .84);
}

.back-btn,
.primary-btn,
.secondary-btn {
  border: 0;
  border-radius: 18px;
  font: inherit;
  transition: transform .16s ease;
}

.back-btn:hover,
.primary-btn:hover,
.secondary-btn:hover {
  transform: translateY(-1px);
}

.back-btn {
  justify-self: start;
  min-width: 78px;
  min-height: 42px;
  padding: 0 16px;
  background: rgba(255, 255, 255, .72);
  color: #1d342b;
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
  color: #3a4a3f;
  font-size: 12px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: #23382d;
  font-size: 13px;
}

.field input {
  width: 100%;
  min-height: 52px;
  border-radius: 18px;
  border: 1px solid rgba(43, 52, 42, .1);
  padding: 0 16px;
  background: rgba(255, 255, 255, .8);
  color: #22352c;
  font: inherit;
}

.field input:focus {
  outline: none;
  border-color: rgba(61, 107, 89, .42);
  box-shadow: 0 0 0 4px rgba(92, 138, 118, .12);
}

.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 158px;
  gap: 12px;
  align-items: end;
}

.code-field {
  min-width: 0;
}

.primary-btn,
.secondary-btn {
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

.code-btn {
  width: 100%;
}

.dev-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(239, 244, 237, .92);
  border: 1px dashed rgba(58, 74, 63, .18);
}

.dev-card strong {
  display: block;
  margin-bottom: 4px;
  color: #173127;
}

.dev-card p {
  margin: 0;
  color: #667467;
}

.dev-card span {
  align-self: center;
  font-size: 24px;
  line-height: 1;
  font-weight: 700;
  color: #173127;
}

.tips-list {
  gap: 12px;
}

.tip-item {
  border-radius: 24px;
  padding: 16px;
  display: grid;
  grid-template-columns: 50px 1fr;
  gap: 12px;
  align-items: start;
}

.tip-index {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #183228, #315043);
  color: #f6f2ea;
  font-weight: 700;
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
  .bind-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .bind-screen {
    padding-inline: 12px;
  }

  .bind-hero,
  .surface-card {
    padding: 18px;
    border-radius: 24px;
  }

  .code-row {
    grid-template-columns: 1fr;
  }

  .tip-item {
    grid-template-columns: 1fr;
  }

  .tip-index {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }
}
</style>
