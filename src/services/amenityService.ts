import { pool } from '../db/pool';

// Types

export interface CreateAmenityInput {
  name:               string;
  description?:       string;
  capacity:           number;
  location?:          string;
  open_time:          string;
  close_time:         string;
  slot_duration_mins: number;
  max_advance_days:   number;
}

export interface UpdateAmenityInput {
  name?:               string;
  description?:        string;
  capacity?:           number;
  location?:           string;
  open_time?:          string;
  close_time?:         string;
  slot_duration_mins?: number;
  max_advance_days?:   number;
  is_active?:          boolean;
}

export interface AmenityFilters {
  search?:          string;
  min_capacity?:    number;
  location?:        string;
  available_today?: boolean;
}

// Custom error

export class AmenityError extends Error {
  constructor(
    public code:    string,
    message:        string,
    public data?:   Record<string, unknown>
  ) {
    super(message);
    this.name = 'AmenityError';
  }
}

// Whitelist of allowed update fields

const ALLOWED_UPDATE_FIELDS: (keyof UpdateAmenityInput)[] = [
  'name', 'description', 'capacity', 'location',
  'open_time', 'close_time', 'slot_duration_mins',
  'max_advance_days', 'is_active',
];

// Helpers

// Convert "HH:MM" or "HH:MM:SS" to minutes since midnight
export function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

// Convert minutes since midnight back to "HH:MM"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Generate all time slots between open and close times
export function generateTimeSlots(
  openTime:         string,
  closeTime:        string,
  slotDurationMins: number
): string[] {
  const slots: string[] = [];
  const openMinutes  = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);

  for (
    let current = openMinutes;
    current + slotDurationMins <= closeMinutes;
    current += slotDurationMins
  ) {
    slots.push(minutesToTime(current));
  }

  return slots;
}

// Check if two time ranges overlap
export function hasOverlap(
  slotStart:    number,
  slotEnd:      number,
  bookingStart: number,
  bookingEnd:   number
): boolean {
  return bookingStart < slotEnd && bookingEnd > slotStart;
}

// Service functions

export async function createAmenity(
  buildingId: string,
  input:      CreateAmenityInput
) {
  const {
    name, description, capacity, location,
    open_time, close_time, slot_duration_mins, max_advance_days,
  } = input;

  const result = await pool.query(
    `INSERT INTO amenities
       (building_id, name, description, capacity, location,
        open_time, close_time, slot_duration_mins, max_advance_days)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, building_id, name, description, capacity, location,
               is_active, open_time, close_time, slot_duration_mins, max_advance_days`,
    [
      buildingId, name, description ?? null, capacity, location ?? null,
      open_time, close_time, slot_duration_mins, max_advance_days,
    ]
  );

  return result.rows[0];
}

export async function getAmenitiesByBuilding(
  buildingId: string,
  filters:    AmenityFilters = {}
) {
  const conditions: string[]  = ['building_id = $1', 'is_active = true'];
  const values:     unknown[] = [buildingId];
  let   paramIndex = 2;

  if (filters.search) {
    conditions.push(
      `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
    );
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.min_capacity) {
    conditions.push(`capacity >= $${paramIndex}`);
    values.push(filters.min_capacity);
    paramIndex++;
  }

  if (filters.location) {
    conditions.push(`location ILIKE $${paramIndex}`);
    values.push(`%${filters.location}%`);
    paramIndex++;
  }

  const result = await pool.query(
    `SELECT
       id, name, description, capacity, location,
       is_active, open_time, close_time,
       slot_duration_mins, max_advance_days
     FROM amenities
     WHERE ${conditions.join(' AND ')}
     ORDER BY name ASC`,
    values
  );

  if (!filters.available_today) {
    return result.rows;
  }

  // Filter by availability today in application layer
  const today = new Date().toISOString().split('T')[0];
  const amenityIds = result.rows.map(a => a.id);

  if (amenityIds.length === 0) return [];

  const bookingsResult = await pool.query(
    `SELECT amenity_id, start_time, end_time
     FROM bookings
     WHERE amenity_id = ANY($1::uuid[])
       AND booking_date = $2
       AND status != 'cancelled'`,
    [amenityIds, today]
  );

  // Group bookings by amenity
  const bookedByAmenity: Record<string, { start_time: string; end_time: string }[]> = {};
  for (const b of bookingsResult.rows) {
    if (!bookedByAmenity[b.amenity_id]) bookedByAmenity[b.amenity_id] = [];
    bookedByAmenity[b.amenity_id].push(b);
  }

  return result.rows.filter(amenity => {
    const bookings = bookedByAmenity[amenity.id] ?? [];
    const slots    = generateTimeSlots(
      amenity.open_time,
      amenity.close_time,
      amenity.slot_duration_mins
    );

    // Return true if at least one slot has no overlapping booking
    return slots.some(slotStart => {
      const slotStartMins = timeToMinutes(slotStart);
      const slotEndMins   = slotStartMins + amenity.slot_duration_mins;

      return !bookings.some(b =>
        hasOverlap(
          slotStartMins,
          slotEndMins,
          timeToMinutes(b.start_time),
          timeToMinutes(b.end_time)
        )
      );
    });
  });
}

export async function getAmenityById(
  amenityId:  string,
  buildingId: string
) {
  const result = await pool.query(
    `SELECT id, building_id, name, description, capacity, location,
            is_active, open_time, close_time, slot_duration_mins,
            max_advance_days, created_at
     FROM amenities
     WHERE id = $1 AND building_id = $2`,
    [amenityId, buildingId]
  );

  if (result.rows.length === 0) {
    throw new AmenityError('AMENITY_NOT_FOUND', 'Amenity not found');
  }

  return result.rows[0];
}

export async function updateAmenity(
  amenityId:  string,
  buildingId: string,
  input:      UpdateAmenityInput
) {
  // Only allow whitelisted fields to prevent SQL injection via column names
  const fields = Object.keys(input).filter(
    f => ALLOWED_UPDATE_FIELDS.includes(f as keyof UpdateAmenityInput)
  ) as (keyof UpdateAmenityInput)[];

  if (fields.length === 0) {
    throw new AmenityError('NO_FIELDS_TO_UPDATE', 'No valid fields to update');
  }

  const values     = fields.map(f => input[f]);
  const setClauses = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');

  const result = await pool.query(
    `UPDATE amenities
     SET ${setClauses}
     WHERE id = $${fields.length + 1} AND building_id = $${fields.length + 2}
     RETURNING id, building_id, name, description, capacity, location,
               is_active, open_time, close_time, slot_duration_mins, max_advance_days`,
    [...values, amenityId, buildingId]
  );

  if (result.rows.length === 0) {
    throw new AmenityError('AMENITY_NOT_FOUND', 'Amenity not found');
  }

  return result.rows[0];
}

export async function deactivateAmenity(
  amenityId:  string,
  buildingId: string
) {
  const result = await pool.query(
    `UPDATE amenities
     SET is_active = false
     WHERE id = $1 AND building_id = $2
     RETURNING id, name, is_active`,
    [amenityId, buildingId]
  );

  if (result.rows.length === 0) {
    throw new AmenityError('AMENITY_NOT_FOUND', 'Amenity not found');
  }

  return result.rows[0];
}

export async function getAvailability(
  amenityId:  string,
  buildingId: string,
  date:       string
) {
  const amenity = await getAmenityById(amenityId, buildingId);

  if (!amenity.is_active) {
    throw new AmenityError('AMENITY_NOT_ACTIVE', 'Amenity is not active');
  }

  const allSlots = generateTimeSlots(
    amenity.open_time,
    amenity.close_time,
    amenity.slot_duration_mins
  );

  const bookingsResult = await pool.query(
    `SELECT start_time, end_time
     FROM bookings
     WHERE amenity_id   = $1
       AND booking_date = $2
       AND status      != 'cancelled'`,
    [amenityId, date]
  );

  const bookedSlots = bookingsResult.rows;

  const slots = allSlots.map(slotStart => {
    const slotStartMins = timeToMinutes(slotStart);
    const slotEndMins   = slotStartMins + amenity.slot_duration_mins;
    const slotEnd       = minutesToTime(slotEndMins);

    const isBooked = bookedSlots.some(booking =>
      hasOverlap(
        slotStartMins,
        slotEndMins,
        timeToMinutes(booking.start_time),
        timeToMinutes(booking.end_time)
      )
    );

    return {
      start_time: slotStart,
      end_time:   slotEnd,
      available:  !isBooked,
    };
  });

  return { amenity_id: amenityId, date, slots };
}