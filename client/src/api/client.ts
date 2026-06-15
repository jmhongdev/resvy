const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?:    T;
}

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

function clearAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

async function request<T>(
  method:       string,
  path:         string,
  body?:        unknown,
  requiresAuth: boolean = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Abort request after 10 seconds
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body:   body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === 'AbortError') {
      throw new Error('Request timed out. Please try again.', { cause: err });
    }
    throw new Error('Network error. Please check your connection.', { cause: err });
  }

  clearTimeout(timeoutId);

  // Session expired — clear auth and redirect to login
  if (response.status === 401 && requiresAuth) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message ?? 'Something went wrong');
  }

  return json.data as T;
}

export const apiClient = {
  get:    <T>(path: string)                 => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)  => request<T>('POST',   path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                 => request<T>('DELETE', path),

  // Public endpoints — no auth header
  postPublic: <T>(path: string, body: unknown) =>
    request<T>('POST', path, body, false),
};