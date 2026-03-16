export interface SecurityQuestionInput {
  question: string;
  answer: string;
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  hasPassword: boolean;
  isMember: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
