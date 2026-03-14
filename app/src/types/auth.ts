export type AuthProvider = 'wechat' | 'qq';

export interface AuthBindings {
  wechat: boolean;
  qq: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  hasPassword: boolean;
  bindings: AuthBindings;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
