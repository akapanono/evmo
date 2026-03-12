import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { cloudService } from '@/services/cloudService';
import { storageService } from '@/services/storageService';
import type { AuthUser } from '@/types/auth';

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

  async function register(input: { name?: string; phone: string; password: string }): Promise<void> {
    loading.value = true;
    try {
      const nextSession = await cloudService.register(input);
      persistSession(nextSession);
    } finally {
      loading.value = false;
    }
  }

  async function login(input: { phone: string; password: string }): Promise<void> {
    loading.value = true;
    try {
      const nextSession = await cloudService.login(input);
      persistSession(nextSession);
    } finally {
      loading.value = false;
    }
  }

  async function refreshCurrentUser(): Promise<void> {
    if (!session.value?.token) {
      return;
    }

    try {
      const nextUser = await cloudService.getCurrentUser();
      persistSession({
        token: session.value.token,
        user: nextUser,
      });
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
    refreshCurrentUser,
    logout,
  };
});
