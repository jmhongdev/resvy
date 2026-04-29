CREATE TABLE buildings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  address     TEXT NOT NULL,
  invite_code VARCHAR(12)  NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

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

CREATE TABLE amenities (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id        UUID         NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name               VARCHAR(100) NOT NULL,
  description        TEXT,
  capacity           INT          NOT NULL DEFAULT 1,
  location           VARCHAR(100),
  is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
  open_time          TIME         NOT NULL DEFAULT '08:00',
  close_time         TIME         NOT NULL DEFAULT '22:00',
  slot_duration_mins INT          NOT NULL DEFAULT 60,
  max_advance_days   INT          NOT NULL DEFAULT 7,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed');

CREATE TABLE bookings (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amenity_id   UUID           NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  booking_date DATE           NOT NULL,
  start_time   TIME           NOT NULL,
  end_time     TIME           NOT NULL,
  status       booking_status NOT NULL DEFAULT 'confirmed',
  notes        TEXT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT no_time_travel CHECK (end_time > start_time)
);

CREATE TABLE amenity_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id    UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0
);

CREATE TYPE history_action AS ENUM ('created', 'cancelled', 'completed', 'modified');

CREATE TABLE booking_history (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action      history_action NOT NULL,
  changed_by  UUID           NOT NULL,
  changed_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_amenity_date
  ON bookings(amenity_id, booking_date)
  WHERE status != 'cancelled';

CREATE INDEX idx_bookings_user_id
  ON bookings(user_id);

CREATE INDEX idx_amenities_building_id
  ON amenities(building_id);

CREATE INDEX idx_users_building_id
  ON users(building_id);

CREATE INDEX idx_users_email
  ON users(email);

INSERT INTO buildings (id, name, address, invite_code) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', '래미안 아파트', '서울특별시 강남구 테헤란로 123', 'DEMO-BUILD1');

INSERT INTO users (id, building_id, name, email, password_hash, role) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', '관리자', 'admin@resvy.com', 'PLACEHOLDER_HASH', 'admin'),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', '김지수', 'jisu@resvy.com', 'PLACEHOLDER_HASH', 'resident');

INSERT INTO amenities (id, building_id, name, description, capacity, location, slot_duration_mins) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001', '헬스장', '최신 운동 기구 완비', 10, 'B1층', 60),
  ('a1b2c3d4-0000-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001', 'BBQ 공간', '옥상 바베큐 시설', 20, '옥상', 120),
  ('a1b2c3d4-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001', '커뮤니티룸', '세미나 및 모임 공간', 15, '1층', 60),
  ('a1b2c3d4-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001', '독서실', '조용한 독서 및 공부 공간', 8, '2층', 60);