import { apiClient } from './client';

export interface UserProfile {
  id:               string;
  name:             string;
  email:            string;
  role:             string;
  created_at:       string;
  building_name:    string;
  building_address: string;
}

export async function getProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/users/me');
}

export async function updateName(name: string): Promise<UserProfile> {
  return apiClient.patch<UserProfile>('/users/me', { name });
}

export async function changePassword(
  currentPassword: string,
  newPassword:     string
): Promise<void> {
  return apiClient.patch('/users/me/password', {
    currentPassword,
    newPassword,
  });
}