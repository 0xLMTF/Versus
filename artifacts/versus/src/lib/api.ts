/**
 * HTTP client + auth helpers for versus-backend.
 */
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'versus_token';
const REFRESH_KEY = 'versus_refresh';

export type ApiUser = {
  id: string;
  name: string;
  tag: string;
  role: 'SUPERADMIN' | 'USER';
  elo: number;
  wins: number;
  losses: number;
  streak: number;
  theme_color: string;
  avatar_url: string | null;
  created_at?: string;
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
  user: ApiUser;
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error || text || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await fetch(`${BASE}${path}`, { headers: authHeaders() }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function login(tag: string, password: string): Promise<AuthResponse> {
  const res = await apiPost<AuthResponse>('/api/auth/login', { tag, password });
  setSession(res.token, res.refreshToken);
  return res;
}

export async function register(
  name: string,
  tag: string,
  password: string,
): Promise<AuthResponse> {
  const normalized = tag.startsWith('@') ? tag : `@${tag}`;
  const res = await apiPost<AuthResponse>('/api/auth/register', {
    name,
    tag: normalized,
    password,
  });
  setSession(res.token, res.refreshToken);
  return res;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  try {
    if (refreshToken) {
      await apiPost('/api/auth/logout', { refreshToken });
    }
  } catch {
    // still clear local session
  }
  clearSession();
}

export async function fetchMe(): Promise<ApiUser> {
  return apiGet<ApiUser>('/api/users/me');
}

export async function updateMe(body: {
  name?: string;
  avatar_url?: string;
  theme_color?: string;
  password?: string;
}): Promise<ApiUser> {
  return apiPatch<ApiUser>('/api/users/me', body);
}

export async function deleteAccount(password: string): Promise<void> {
  await apiDelete('/api/users/me', { password });
  clearSession();
}

export async function healthCheck(): Promise<{ status: string }> {
  return apiGet('/api/health');
}

export { BASE as API_BASE };
