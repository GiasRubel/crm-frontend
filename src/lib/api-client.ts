// All calls go through the same-origin BFF proxy (/api/backend/*) — the
// browser never holds a bearer token, the proxy route attaches it server-side.
const PROXY_BASE = "/api/backend";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function isSubscriptionLockedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 402;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${PROXY_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // class-validator errors arrive as an array of messages — surface the first one
    const message = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message;
    throw new ApiError(response.status, message || "Something went wrong");
  }

  // 204 No Content (e.g. DELETE) has no body to parse
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/** Non-JSON responses (file downloads, e.g. .ics calendar exports). */
async function requestBlob(endpoint: string): Promise<Blob> {
  const url = `${PROXY_BASE}${endpoint}`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message;
    throw new ApiError(response.status, message || "Something went wrong");
  }
  return response.blob();
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: "GET" }),
  getBlob: (endpoint: string) => requestBlob(endpoint),
  post: <T>(endpoint: string, body: unknown, options?: RequestInit) => request<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown, options?: RequestInit) => request<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) => request<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: "DELETE" }),
};
