import bcrypt from 'bcrypt';
import { pool } from '../db/pool';

export async function getProfile(userId: string) {
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
    throw new Error('USER_NOT_FOUND');
  }

  return result.rows[0];
}

export async function updateName(userId: string, name: string) {
  const result = await pool.query(
    `UPDATE users
     SET name = $1
     WHERE id = $2
     RETURNING id, name, email, role`,
    [name, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('USER_NOT_FOUND');
  }

  return result.rows[0];
}

export async function changePassword(
  userId:          string,
  currentPassword: string,
  newPassword:     string
) {
  // 1. Get current password hash
  const result = await pool.query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('USER_NOT_FOUND');
  }

  // 2. Verify current password is correct
  const isMatch = await bcrypt.compare(
    currentPassword,
    result.rows[0].password_hash
  );

  if (!isMatch) {
    throw new Error('WRONG_CURRENT_PASSWORD');
  }

  // 3. Hash and save the new password
  const newHash = await bcrypt.hash(newPassword, 12);

  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [newHash, userId]
  );
}