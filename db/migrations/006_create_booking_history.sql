CREATE TYPE history_action AS ENUM ('created', 'cancelled', 'completed', 'modified');

CREATE TABLE booking_history (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action      history_action NOT NULL,
  changed_by  UUID           NOT NULL,
  changed_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);