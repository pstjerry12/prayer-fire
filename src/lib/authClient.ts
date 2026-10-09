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

/** Error from the auth API; `googleOnly` means the account was created with Google and has no password. */
export class AuthError extends Error {
  googleOnly = false;
}

// Remembers who last signed in on this device, so the sign-in form can fill in
// their email/phone and they only have to type their password.
const LAST_LOGIN_KEY = "pfm_last_login";

export interface LastLogin {
  id: string; // email or phone, as the sign-in form expects it
  method: "password" | "google";
  name?: string | null;
}

export function getLastLogin(): LastLogin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_LOGIN_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastLogin>;
    if (typeof v.id !== "string" || !v.id) return null;
    return { id: v.id, method: v.method === "google" ? "google" : "password", name: v.name ?? null };
  } catch {
    return null;
  }
}

export function setLastLogin(v: LastLogin): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify(v));
  } catch {
    // storage unavailable — the form just won't be pre-filled
  }
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new AuthError((data as { error?: string }).error || "Something went wrong. Please try again.");
    err.googleOnly = (data as { googleOnly?: boolean }).googleOnly === true;
    throw err;
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

export type SessionCheck =
  | { status: "ok"; user: AuthUser }
  | { status: "invalid" } // the server answered: this session is expired or the account is gone
  | { status: "error" }; // offline / server hiccup — keep whatever we had

/**
 * Asks the server who this device is signed in as. Sends the stored token as a
 * Bearer header as well as the cookie: the Android app's WebView never gets the
 * cookie after Google sign-in (the token only comes back via a deep link), so
 * without the header the server couldn't recognise those users — and wouldn't
 * count them in Daily activity.
 */
export async function checkSession(): Promise<SessionCheck> {
  try {
    const token = getStoredToken();
    const res = await fetch("/api/auth/me", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return { status: "error" };
    const data = (await res.json()) as { user: AuthUser | null };
    return data.user ? { status: "ok", user: data.user } : { status: "invalid" };
  } catch {
    return { status: "error" };
  }
}

export async function fetchMe(): Promise<AuthUser | null> {
  const check = await checkSession();
  return check.status === "ok" ? check.user : null;
}
