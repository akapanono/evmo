export interface AuthUser {
  id: string;
  name: string;
  phone: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
