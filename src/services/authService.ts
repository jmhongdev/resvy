import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import type { RegisterInput, LoginInput, JwtPayload } from '../types/auth';
import { AppError } from '../types/errors';

//Constants

const SALT_ROUNDS        = 12;
const ACCESS_TOKEN_EXPIRY  = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES    = 15;

// Custom error class

export class AuthError extends Error {
  constructor(
    public code:    string,
    message:        string,
    public data?:   Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Helpers

function getSecret(key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const secret = process.env[key];
  if (!secret) throw new Error(`Missing required environment variable: ${key}`);
  return secret;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret('JWT_SECRET'), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

// Register

export async function register(input: RegisterInput) {
  const { name, email, password, building_code } = input;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Find the building by code
    const buildingResult = await client.query(
      `SELECT id FROM buildings WHERE invite_code = $1`,
      [building_code]
    );

    if (buildingResult.rows.length === 0) {
      throw new AuthError('INVALID_BUILDING_CODE', 'Building code not found');
    }

    const buildingId = buildingResult.rows[0].id;

    // 2. Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Insert the user
    let userResult;
    try {
      userResult = await client.query(
        `INSERT INTO users (building_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'resident')
         RETURNING id, name, email, role, building_id`,
        [buildingId, name, email, passwordHash]
      );
    } catch (err: unknown) {
      if (
        typeof err === 'object' && err !== null && 'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new AuthError('EMAIL_ALREADY_EXISTS', 'Email already registered');
      }
      throw err;
    }

    await client.query('COMMIT');

    const user = userResult.rows[0];

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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Login

export async function login(input: LoginInput) {
  const { email, password } = input;

  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, building_id,
            failed_login_attempts, locked_until
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    // Generic error 
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const user = result.rows[0];

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 1000 / 60
    );
    throw new AuthError('ACCOUNT_LOCKED', 'Account is locked', { minutesLeft });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    const attempts = user.failed_login_attempts + 1;

    // Single query handles both locking and incrementing
    await pool.query(
      `UPDATE users
       SET failed_login_attempts = $1,
           locked_until = CASE
             WHEN $1 >= $2 THEN NOW() + INTERVAL '15 minutes'
             ELSE NULL
           END
       WHERE id = $3`,
      [attempts, MAX_LOGIN_ATTEMPTS, user.id]
    );

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new AuthError('ACCOUNT_LOCKED', 'Account locked due to too many failed attempts', {
        minutesLeft: LOCKOUT_MINUTES,
      });
    }

    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', {
      attemptsLeft: MAX_LOGIN_ATTEMPTS - attempts,
    });
  }

  // Successful login , reset counter
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         locked_until          = NULL
     WHERE id = $1`,
    [user.id]
  );

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
    const payload = jwt.verify(
      refreshToken,
      getSecret('JWT_REFRESH_SECRET')
    ) as JwtPayload;

    return {
      accessToken: generateAccessToken({
        userId:     payload.userId,
        buildingId: payload.buildingId,
        role:       payload.role,
      }),
    };
  } catch {
    throw new AuthError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }
}