export const TOKEN_KEY = "wmh_super_token";

// When VITE_API_BASE_URL is set (e.g. Vercel frontend → Railway/Render API),
// all authFetch calls prepend it so /api/... become absolute URLs.
// Locally it is empty so relative paths work via Vite's dev-server proxy.
const _API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export const BASE = `${_API_BASE}/api`;

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

/** Authenticated fetch — merges auth headers with any supplied options.
 *  Relative /api/... URLs are automatically prefixed with VITE_API_BASE_URL
 *  when set, so the same code works both locally and on Vercel. */
export function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const t = sessionStorage.getItem(TOKEN_KEY);
  const fullUrl = _API_BASE && url.startsWith("/") ? `${_API_BASE}${url}` : url;
  return fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}
