import { keycloak } from "./keycloak";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Attach Keycloak access token if authenticated on the client side
  if (typeof window !== "undefined" && keycloak.authenticated) {
    try {
      // Refresh token if it will expire in less than 30 seconds
      await keycloak.updateToken(30);
      if (keycloak.token) {
        headers["Authorization"] = `Bearer ${keycloak.token}`;
      }
    } catch (error) {
      console.error("Failed to refresh Keycloak token before request", error);
    }
  }

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

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body: unknown, options?: RequestInit) => request<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown, options?: RequestInit) => request<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) => request<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: "DELETE" }),
};
