import type { JwtPayload as JwtBasePayload } from 'jsonwebtoken';

export interface RegisterInput {
  name:          string;
  email:         string;
  password:      string;
  building_code: string;
}

export interface LoginInput {
  email:    string;
  password: string;
}

export interface JwtPayload extends JwtBasePayload {
  userId:     string;
  buildingId: string;
  role:       'resident' | 'admin';
}