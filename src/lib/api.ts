"use client";

/**
 * Typed client-side fetch service.
 *
 * All client components MUST use these helpers instead of raw `fetch()`
 * so every call/response follows the same `{ ok, data?, error? }` shape.
 */

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  total?: number;
  error?: any;
}

function readCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)ef_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const method = (options?.method || "GET").toUpperCase();
    const headers: Record<string, string> = {
      ...((options?.headers as Record<string, string>) || {}),
    };
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const token = readCsrfToken();
      if (token) headers["X-CSRF-Token"] = token;
    }
    const res = await fetch(url, { ...options, headers, credentials: "include" });
    const json = (await res.json()) as ApiResponse<T>;
    return json;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const api = {
  get<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url);
  },

  post<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  put<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  delete<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url, { method: "DELETE" });
  },
};
