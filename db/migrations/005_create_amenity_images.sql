CREATE TABLE amenity_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id    UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0
);