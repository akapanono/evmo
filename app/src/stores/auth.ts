import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { cloudService } from '@/services/cloudService';
import { storageService } from '@/services/storageService';
import type { AuthUser, SecurityQuestionInput } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  const session = ref(storageService.getAuthSession());
  const loading = ref(false);

  const token = computed(() => session.value?.token || '');
  const user = computed<AuthUser | null>(() => session.value?.user ?? null);
  const isLoggedIn = computed(() => Boolean(session.value?.token && session.value?.user));

  function persistSession(nextSession: typeof session.value): void {
    session.value = nextSession;
    if (nextSession) {
      storageService.saveAuthSession(nextSession);
    } else {
      storageService.clearAuthSession();
    }
  }

  function updateUser(nextUser: AuthUser): void {
    if (!session.value?.token) {
      return;
    }

    persistSession({
      token: session.value.token,
      user: nextUser,
    });
  }

  async function register(input: {
    username: string;
    password: string;
    confirmPassword: string;
    securityQuestions: SecurityQuestionInput[];
  }): Promise<void> {
    loading.value = true;
    try {
      persistSession(await cloudService.register(input));
    } finally {
      loading.value = false;
    }
  }

  async function login(input: { username: string; password: string }): Promise<void> {
    loading.value = true;
    try {
      persistSession(await cloudService.login(input));
    } finally {
      loading.value = false;
    }
  }

  async function getPasswordResetQuestions(username: string): Promise<string[]> {
    loading.value = true;
    try {
      const result = await cloudService.getPasswordResetQuestions(username);
      return result.questions;
    } finally {
      loading.value = false;
    }
  }

  async function resetPassword(input: {
    username: string;
    securityAnswers: string[];
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<void> {
    loading.value = true;
    try {
      persistSession(await cloudService.resetPassword(input));
    } finally {
      loading.value = false;
    }
  }

  async function refreshCurrentUser(): Promise<void> {
    if (!session.value?.token) {
      return;
    }

    try {
      updateUser(await cloudService.getCurrentUser());
    } catch {
      persistSession(null);
    }
  }

  function logout(): void {
    persistSession(null);
  }

  return {
    token,
    user,
    isLoggedIn,
    loading,
    register,
    login,
    getPasswordResetQuestions,
    resetPassword,
    refreshCurrentUser,
    logout,
  };
});
