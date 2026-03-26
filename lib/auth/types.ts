export interface AuthUserRecord {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
}
