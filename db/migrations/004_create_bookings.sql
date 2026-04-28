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