-- Weekly recurring closure days per amenity.
-- 0 = Sunday, 1 = Monday, ... 6 = Saturday (matches PostgreSQL EXTRACT(DOW))
ALTER TABLE amenities
  ADD COLUMN closed_weekdays INTEGER[] NOT NULL DEFAULT '{}';

-- Specific holiday dates per amenity. An amenity can have multiple holidays.
CREATE TABLE amenity_holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id  UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  UNIQUE (amenity_id, holiday_date)
);

CREATE INDEX idx_amenity_holidays_lookup
  ON amenity_holidays(amenity_id, holiday_date);