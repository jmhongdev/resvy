import { Pool } from 'pg';

// Validate required environment variables at startup.
// Fail fast with a clear message rather than a cryptic connection error.
const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool limits — important for production
  max:                    10,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 2000,
});

// Log unexpected client errors but don't crash the server
// The pool handles reconnection automatically
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
});