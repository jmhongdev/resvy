import bcrypt from 'bcrypt';
import { pool } from '../db/pool';

// Constants

// Keep in sync with authService.ts SALT_ROUNDS
const SALT_ROUNDS = 12;

// Custom error

export class UserError extends Error {
  constructor(
    public code:    string,
    message:        string,
    public data?:   Record<string, unknown>
  ) {
    super(message);
    this.name = 'UserError';
  }
}

// Return type interfaces

export interface UserProfile {
  id:               string;
  name:             string;
  email:            string;
  role:             string;
  created_at:       string;
  building_name:    string;
  building_address: string;
}

export interface UserBasic {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

// Service functions

export async function getProfile(userId: string): Promise<UserProfile> {
  const result = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.created_at,
       b.name    AS building_name,
       b.address AS building_address
     FROM users u
     JOIN buildings b ON u.building_id = b.id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new UserError('USER_NOT_FOUND', 'User not found');
  }

  return result.rows[0];
}

export async function updateName(
  userId: string,
  name:   string
): Promise<UserBasic> {
  const result = await pool.query(
    `UPDATE users
     SET name = $1
     WHERE id = $2
     RETURNING id, name, email, role`,
    [name, userId]
  );

  if (result.rows.length === 0) {
    throw new UserError('USER_NOT_FOUND', 'User not found');
  }

  return result.rows[0];
}

export async function changePassword(
  userId:          string,
  currentPassword: string,
  newPassword:     string
): Promise<void> {
  // 1. Get current password hash
  const result = await pool.query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new UserError('USER_NOT_FOUND', 'User not found');
  }

  // 2. Verify current password is correct before changing
  const isMatch = await bcrypt.compare(
    currentPassword,
    result.rows[0].password_hash
  );

  if (!isMatch) {
    throw new UserError('WRONG_CURRENT_PASSWORD', 'Current password is incorrect');
  }

  // 3. Hash the new password with the same rounds as registration
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [newHash, userId]
  );
}