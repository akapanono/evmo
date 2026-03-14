import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { cloudService } from '@/services/cloudService';
import { storageService } from '@/services/storageService';
import type { AuthProvider, AuthUser } from '@/types/auth';

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

  async function register(input: { name?: string; phone: string; password: string }): Promise<void> {
    loading.value = true;
    try {
      persistSession(await cloudService.register(input));
    } finally {
      loading.value = false;
    }
  }

  async function login(input: { phone: string; password: string }): Promise<void> {
    loading.value = true;
    try {
      persistSession(await cloudService.login(input));
    } finally {
      loading.value = false;
    }
  }

  async function loginWithProvider(input: { provider: AuthProvider; providerId: string; displayName?: string }): Promise<void> {
    loading.value = true;
    try {
      persistSession(await cloudService.providerLogin(input));
    } finally {
      loading.value = false;
    }
  }

  async function bindPhoneWithCode(input: { phone: string; code: string }): Promise<void> {
    loading.value = true;
    try {
      updateUser(await cloudService.bindPhoneWithCode(input));
    } finally {
      loading.value = false;
    }
  }

  async function bindProvider(input: { provider: AuthProvider; providerId: string }): Promise<void> {
    loading.value = true;
    try {
      updateUser(await cloudService.bindProvider(input));
    } finally {
      loading.value = false;
    }
  }

  async function unbindProvider(provider: AuthProvider): Promise<void> {
    loading.value = true;
    try {
      updateUser(await cloudService.unbindProvider(provider));
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
    loginWithProvider,
    bindPhoneWithCode,
    bindProvider,
    unbindProvider,
    refreshCurrentUser,
    logout,
  };
});
