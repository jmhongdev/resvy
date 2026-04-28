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