-- Availability check query indexes
-- Used for filters like WHERE amenity_id = $1 AND booking_date = $2 AND status != 'cancelled'
CREATE INDEX idx_bookings_amenity_date
  ON bookings(amenity_id, booking_date)
  WHERE status != 'cancelled';

-- User's booking history lookup
CREATE INDEX idx_bookings_user_id
  ON bookings(user_id);

-- Amenities per building lookup
CREATE INDEX idx_amenities_building_id
  ON amenities(building_id);

-- Users per building lookup
CREATE INDEX idx_users_building_id
  ON users(building_id);

-- Email lookup for login
CREATE INDEX idx_users_email
  ON users(email);