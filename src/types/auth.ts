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

export interface JwtPayload {
  userId:     string;
  buildingId: string;
  role:       'resident' | 'admin';
}