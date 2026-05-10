import { apiClient } from './client';

interface AuthResult {
  user: {
    id:    string;
    name:  string;
    email: string;
    role:  'resident' | 'admin';
  };
  accessToken:  string;
  refreshToken: string;
}

export async function register(
  name:          string,
  email:         string,
  password:      string,
  building_code: string
): Promise<AuthResult> {
  return apiClient.postPublic<AuthResult>('/auth/register', {
    name, email, password, building_code,
  });
}

export async function login(
  email:    string,
  password: string
): Promise<AuthResult> {
  return apiClient.postPublic<AuthResult>('/auth/login', {
    email, password,
  });
}