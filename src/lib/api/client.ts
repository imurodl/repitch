// Core API client: env config, fetch wrapper, SSE stream helper.
// Every other src/lib/api/*.ts module dispatches between mock and real
// implementations based on apiConfig.useMock.

const truthy = (v: string | undefined) => v === "true" || v === "1";

export const apiConfig = {
  // Default to mocks unless explicitly disabled. Production demo stays on mocks
  // until backend is reachable.
  useMock: !truthy(import.meta.env.VITE_DISABLE_MOCK),
  baseUrl: (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, ""),
};

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions extends RequestInit {
  json?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

const buildUrl = (path: string, query?: RequestOptions["query"]) => {
  const url = new URL(apiConfig.baseUrl + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
};

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { json, query, headers, ...rest } = opts;
  const init: RequestInit = {
    ...rest,
    headers: {
      "Accept": "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  };
  if (json !== undefined) init.body = JSON.stringify(json);

  const res = await fetch(buildUrl(path, query), init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Stream a text/plain SSE-style response chunk by chunk.
 * The backend may send raw text or `data: ...\n\n` SSE frames — this helper
 * just yields decoded UTF-8 chunks as they arrive. Consumers concatenate.
 */
export async function* streamText(
  path: string,
  opts: RequestOptions = {},
): AsyncIterable<string> {
  const { json, query, headers, signal, ...rest } = opts;
  const res = await fetch(buildUrl(path, query), {
    ...rest,
    method: rest.method ?? "POST",
    signal,
    headers: {
      "Accept": "text/plain",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) yield chunk;
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}
