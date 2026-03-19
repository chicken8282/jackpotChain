const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * 백엔드 공통 응답 래퍼 타입이다.
 */
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

/**
 * 공통 GET 요청을 수행하고 응답 데이터만 반환한다.
 */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}
