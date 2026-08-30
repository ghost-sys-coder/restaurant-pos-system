// Centralized API and Fetch interceptor for Clerk authentication
let tokenProvider: (() => Promise<string | null>) | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public requestId?: string) { super(message); }
}

export function setAuthTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider;
}

export async function getAuthToken(): Promise<string | null> {
  if (tokenProvider) {
    try {
      const token = await tokenProvider();
      if (token) return token;
    } catch (e) {
      // ignore
    }
  }

  // Direct Clerk JS window fallback
  const clerk = (window as any).Clerk;
  if (clerk?.session) {
    try {
      const token = await clerk.session.getToken();
      if (token) return token;
    } catch (e) {
      // ignore
    }
  }

  return null;
}

const originalFetch = window.fetch.bind(window);

// Global interceptor that ensures every /api/ request gets the Clerk Authorization Bearer header
window.fetch = async function (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();

  if (url.includes('/api/')) {
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));

    if (!headers.has('Authorization')) {
      let token = await getAuthToken();

      // If token is not ready yet during initial mount, wait up to 1.5s for Clerk to initialize
      if (!token) {
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 200));
          token = await getAuthToken();
          if (token) break;
        }
      }

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await originalFetch(input, {
      ...init,
      credentials: init.credentials || 'same-origin',
      headers,
    });
    if (response.status === 401) {
      const body = await response.clone().json().catch(() => ({}));
      if (body.code === 'STAFF_SESSION_REQUIRED' || body.code === 'TERMINAL_REQUIRED') window.dispatchEvent(new CustomEvent('vc:access-required', { detail: body.code }));
    }
    return response;
  }

  return originalFetch(input, init);
};

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return window.fetch(input, init);
}

export async function apiJson<T>(path: string, init: RequestInit = {}, retries = init.method && init.method !== 'GET' ? 0 : 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await apiFetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new ApiError(body.error || 'Request failed', response.status, body.code, body.requestId || response.headers.get('x-request-id') || undefined);
      return body as T;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError || attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw lastError;
}
