export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  params?: object;
  body?: unknown;
}

export async function apiRequest<T>(path: string, { method = 'GET', params, body }: RequestOptions = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const qs = query.size ? `?${query}` : '';

  const res = await fetch(`${path.startsWith('http') ? path : API_BASE_URL + path}${qs}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new ApiError(0, 'Cannot reach the notification API. Is the backend running?');
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ApiError(res.status, payload?.error?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
