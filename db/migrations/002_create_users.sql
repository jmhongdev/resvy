CREATE TYPE user_role AS ENUM ('resident', 'admin');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id   UUID         NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          user_role    NOT NULL DEFAULT 'resident',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);