// Base URL of Express backend
const BASE_URL = 'http://localhost:3000';

// Shape of every API response
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?:    T;
}

// Gets the access token from localStorage
function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

// Main request function
async function request<T>(
  method:  string,
  path:    string,
  body?:   unknown,
  requiresAuth: boolean = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach the JWT token
  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Something went wrong');
  }

  return json.data as T;
}

// Convenience methods
export const apiClient = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)   => request<T>('POST',   path, body),
  patch:  <T>(path: string, body?: unknown)  => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => request<T>('DELETE', path),

  // For endpoints that don't need auth (login, register)
  postPublic: <T>(path: string, body: unknown) =>
    request<T>('POST', path, body, false),
};