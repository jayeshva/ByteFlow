import axios, { type AxiosError, type AxiosInstance } from "axios";

const DEFAULT_TIMEOUT_MS = 15000;
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://instaflow-api-164769631212.us-central1.run.app"
).replace(/\/+$/, "");

const baseConfig = {
  baseURL: API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

export const apiClient: AxiosInstance = axios.create(baseConfig);
const refreshClient: AxiosInstance = axios.create(baseConfig);

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
  requestId?: string;
};

const getStorageItem = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStorageItem = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage is not available (private mode or quota exceeded).
  }
};

const removeStorageItem = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage is not available (private mode or quota exceeded).
  }
};

const getAccessToken = () => getStorageItem(ACCESS_TOKEN_KEY);
const getRefreshToken = () => getStorageItem(REFRESH_TOKEN_KEY);

export const setAuthTokens = (accessToken?: string, refreshToken?: string) => {
  if (accessToken) setStorageItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) setStorageItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearAuthTokens = () => {
  removeStorageItem(ACCESS_TOKEN_KEY);
  removeStorageItem(REFRESH_TOKEN_KEY);
  removeStorageItem("isLoggedIn");
  removeStorageItem("isIGConnected");
};

const createRequestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const normalizeApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | Record<string, unknown>
      | undefined;
    const message =
      (typeof responseData?.message === "string" && responseData.message) ||
      (typeof responseData?.error === "string" && responseData.error) ||
      error.message ||
      "Request failed";
    const code =
      (typeof responseData?.code === "string" && responseData.code) ||
      error.code;
    const requestId = error.response?.headers?.["x-request-id"];
    return {
      message,
      status: error.response?.status,
      code,
      details: responseData,
      requestId,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Unexpected error" };
};

export const getErrorMessage = (
  error: unknown,
  fallback = "Request failed."
) => {
  console.log("Getting error message...");
  const errorMessage = normalizeApiError(error).message || fallback;
  console.log("Error message obtained:", errorMessage);
  return errorMessage;
};

export const getApiBaseUrl = () => API_BASE_URL;

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();

  console.log("🔄 [Token Refresh] Starting refresh...");
  console.log("🔄 [Token Refresh] Refresh token present:", !!refreshToken);

  if (!refreshToken) {
    console.log("❌ [Token Refresh] No refresh token found in storage");
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post(
        "/auth/refresh",
        { refreshToken },
        { headers: { "X-Request-Id": createRequestId() } }
      )
      .then((response) => {
        console.log("✅ [Token Refresh] Response received:", response.status);
        const accessToken = response.data?.accessToken as string | undefined;
        if (accessToken) {
          console.log("✅ [Token Refresh] New access token obtained");
          setAuthTokens(accessToken);
        } else {
          console.log("❌ [Token Refresh] No accessToken in response data");
        }
        return accessToken ?? null;
      })
      .catch((error) => {
        console.error("❌ [Token Refresh] Failed:", error?.response?.data || error?.message);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
  const requestId = createRequestId();
  if (config.headers) {
    config.headers['X-Request-Id'] = requestId;
  }

  const token = getAccessToken();
  // console.log("[HTTP] Request to:", config.url, "| Token present:", !!token);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (typeof error.config & {
        _retry?: boolean;
      })
      | undefined;

    console.log("🔴 [Interceptor] Error:", error.response?.status, originalRequest?.url);

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;
      console.log("🔄 [Interceptor] 401 detected, attempting token refresh...");

      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        console.log("✅ [Interceptor] Token refreshed, retrying original request...");
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      }

      // Only clear tokens and redirect if refresh truly failed
      console.log("❌ [Interceptor] Token refresh failed, clearing tokens and redirecting...");
      clearAuthTokens();
      window.location.href = "/login";
      return Promise.reject(normalizeApiError(error));
    }

    return Promise.reject(normalizeApiError(error));
  }
);

export type RootApiError = ReturnType<typeof normalizeApiError>;
export const logout = () => {
  console.log("Logging out user...");
  localStorage.clear();
  console.log("User logged out.");
  clearAuthTokens();
  window.location.href = "/login";
};
