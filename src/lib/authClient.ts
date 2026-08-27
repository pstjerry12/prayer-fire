import type { AuthUser } from "@/app/types";

export type { AuthUser };

const TOKEN_KEY = "pfm_token";
const USER_KEY = "pfm_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  }
  return data as T;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export interface RegisterPayload {
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  password: string;
}

export async function apiRegister(payload: RegisterPayload): Promise<AuthResult> {
  const data = await post<AuthResult>("/api/auth/register", payload);
  storeSession(data.token, data.user);
  return data;
}

export async function apiLogin(identifier: string, password: string): Promise<AuthResult> {
  const data = await post<AuthResult>("/api/auth/login", { identifier, password });
  storeSession(data.token, data.user);
  return data;
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore network errors on logout
  }
  clearSession();
}

export async function apiDeleteAccount(): Promise<void> {
  try {
    await fetch("/api/auth/account", { method: "DELETE" });
  } catch {
    // ignore network errors
  }
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AuthUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}
