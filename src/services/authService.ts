import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { RegisterInput, LoginInput, JwtPayload } from '../types/auth';

// How many times bcrypt hashes the password.
const SALT_ROUNDS = 12;

// Access token expires quickly
const ACCESS_TOKEN_EXPIRY  = '15m';

// Refresh token lives longer
const REFRESH_TOKEN_EXPIRY = '7d';

// Token helpers

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

// Register

export async function register(input: RegisterInput) {
  const { name, email, password, building_code } = input;

  // 1. Find the building by code
  const buildingResult = await pool.query(
    `SELECT id FROM buildings WHERE invite_code = $1`,
    [building_code]
  );

  if (buildingResult.rows.length === 0) {
    throw new Error('INVALID_BUILDING_CODE');
  }

  const buildingId = buildingResult.rows[0].id;

  // 2. Check if email is already registered
  const existingUser = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  // 3. Hash the password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 4. Insert the new user
  const userResult = await pool.query(
    `INSERT INTO users (building_id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'resident')
     RETURNING id, name, email, role, building_id`,
    [buildingId, name, email, passwordHash]
  );

  const user = userResult.rows[0];

  // 5. Generate tokens
  const payload: JwtPayload = {
    userId:     user.id,
    buildingId: user.building_id,
    role:       user.role,
  };

  return {
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
    accessToken:  generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

// Login

export async function login(input: LoginInput) {
  const { email, password } = input;

  // 1. Find user by email
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, building_id,
            failed_login_attempts, locked_until
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    // Use generic error so that it doesn't reveal whether email exists
    throw new Error('INVALID_CREDENTIALS');
  }

  const user = result.rows[0];

  // 2. Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 1000 / 60
    );
    throw new Error(`ACCOUNT_LOCKED:${minutesLeft}`);
  }

  // 3. Compare password against stored hash
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    // Increment failed attempts
    const attempts = user.failed_login_attempts + 1;
    const maxAttempts = 5;

    if (attempts >= maxAttempts) {
      // Lock the account for 15 minutes
      await pool.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until          = NOW() + INTERVAL '15 minutes'
         WHERE id = $2`,
        [attempts, user.id]
      );
      throw new Error('ACCOUNT_LOCKED:15');
    } else {
      // Just increment the counter
      await pool.query(
        `UPDATE users
         SET failed_login_attempts = $1
         WHERE id = $2`,
        [attempts, user.id]
      );
      throw new Error(`INVALID_CREDENTIALS:${maxAttempts - attempts}`);
    }
  }

  // 4. Successful login, reset the failed attempts counter
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         locked_until          = NULL
     WHERE id = $1`,
    [user.id]
  );

  // 5. Generate tokens
  const payload: JwtPayload = {
    userId:     user.id,
    buildingId: user.building_id,
    role:       user.role,
  };

  return {
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
    accessToken:  generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

// Refresh token

export async function refresh(refreshToken: string) {
  try {
    // Verify the refresh token is valid and not expired
    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as JwtPayload;

    // Issue a new access token
    const newAccessToken = generateAccessToken({
      userId:     payload.userId,
      buildingId: payload.buildingId,
      role:       payload.role,
    });

    return { accessToken: newAccessToken };
  } catch {
    throw new Error('INVALID_REFRESH_TOKEN');
  }
}