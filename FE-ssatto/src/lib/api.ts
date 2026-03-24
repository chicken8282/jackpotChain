const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * 백엔드 공통 응답 래퍼 타입이다.
 */
export interface ApiResponse<T> {
  code: string | number;
  message: string;
  data: T;
}

/**
 * HTTP 응답 실패를 표현하는 API 예외다.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string | number;

  constructor(message: string, status: number, code?: string | number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function buildHeaders(token?: string): HeadersInit {
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * 공통 GET 요청을 수행하고 응답 데이터만 반환한다.
 */
export async function getJson<T>(path: string, signal?: AbortSignal, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(token),
    credentials: "include",
    signal,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? `API request failed: ${response.status}`,
      response.status,
      payload?.code,
    );
  }

  if (payload == null) {
    throw new ApiError("API response body is empty.", response.status);
  }

  return payload.data;
}

/**
 * 공통 POST 요청을 수행하고 응답 데이터만 반환한다.
 */
export async function postJson<T, B>(
  path: string,
  body: B,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...buildHeaders(token),
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? `API request failed: ${response.status}`,
      response.status,
      payload?.code,
    );
  }

  return payload?.data as T;
}
