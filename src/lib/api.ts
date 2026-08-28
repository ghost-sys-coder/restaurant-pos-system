// Centralized API and Fetch interceptor for Clerk authentication
let tokenProvider: (() => Promise<string | null>) | null = null;

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

    return originalFetch(input, {
      ...init,
      credentials: init.credentials || 'same-origin',
      headers,
    });
  }

  return originalFetch(input, init);
};

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return window.fetch(input, init);
}
