export const TOKEN_KEY = "wmh_super_token";
export const BASE = "/api";

/** Raw token string — empty string if not logged in. */
export function token(): string {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

/** Request headers with Content-Type + Authorization (if logged in). */
export function authHeaders(): Record<string, string> {
  const t = sessionStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

/** Authenticated fetch — merges auth headers with any supplied options. */
export function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const t = sessionStorage.getItem(TOKEN_KEY);
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}
