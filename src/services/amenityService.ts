import { pool } from '../db/pool';

//Types
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

//Helpers
// Generates all possible time slots for a given amenity on a given date.
function generateTimeSlots(
  openTime:        string,
  closeTime:       string,
  slotDurationMins: number
): string[] {
  const slots: string[] = [];

  // Parse "HH:MM" into total minutes since midnight
  const [openHour,  openMin]  = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);

  const openMinutes  = openHour  * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  // Walk from open to close in slot-sized steps
  for (
    let current = openMinutes;
    current + slotDurationMins <= closeMinutes;
    current += slotDurationMins
  ) {
    const hour   = Math.floor(current / 60);
    const minute = current % 60;

    // Format back to "HH:MM"
    slots.push(
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    );
  }

  return slots;
}

// Service functions

export async function createAmenity(
  buildingId: string,
  input:      CreateAmenityInput
) {
  const {
    name, description, capacity, location,
    open_time, close_time, slot_duration_mins, max_advance_days
  } = input;

  const result = await pool.query(
    `INSERT INTO amenities
       (building_id, name, description, capacity, location,
        open_time, close_time, slot_duration_mins, max_advance_days)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      buildingId, name, description ?? null, capacity, location ?? null,
      open_time, close_time, slot_duration_mins, max_advance_days
    ]
  );

  return result.rows[0];
}

export async function getAmenitiesByBuilding(buildingId: string) {
  const result = await pool.query(
    `SELECT
       id, name, description, capacity, location,
       is_active, open_time, close_time,
       slot_duration_mins, max_advance_days
     FROM amenities
     WHERE building_id = $1
     ORDER BY name ASC`,
    [buildingId]
  );

  return result.rows;
}

export async function getAmenityById(amenityId: string, buildingId: string) {
  const result = await pool.query(
    `SELECT *
     FROM amenities
     WHERE id = $1 AND building_id = $2`,
    [amenityId, buildingId]
  );

  if (result.rows.length === 0) {
    throw new Error('AMENITY_NOT_FOUND');
  }

  return result.rows[0];
}

export async function updateAmenity(
  amenityId:  string,
  buildingId: string,
  input:      UpdateAmenityInput
) {
  // Dynamically build the SET clause from only the fields provided.
  const fields  = Object.keys(input) as (keyof UpdateAmenityInput)[];
  const values  = fields.map(f => input[f]);

  if (fields.length === 0) {
    throw new Error('NO_FIELDS_TO_UPDATE');
  }

  const setClauses = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');

  const result = await pool.query(
    `UPDATE amenities
     SET ${setClauses}
     WHERE id = $${fields.length + 1} AND building_id = $${fields.length + 2}
     RETURNING *`,
    [...values, amenityId, buildingId]
  );

  if (result.rows.length === 0) {
    throw new Error('AMENITY_NOT_FOUND');
  }

  return result.rows[0];
}

export async function deactivateAmenity(
  amenityId:  string,
  buildingId: string
) {
  // Soft delete: this part never actually deletes amenities. Just mark them inactive.
  const result = await pool.query(
    `UPDATE amenities
     SET is_active = false
     WHERE id = $1 AND building_id = $2
     RETURNING *`,
    [amenityId, buildingId]
  );

  if (result.rows.length === 0) {
    throw new Error('AMENITY_NOT_FOUND');
  }

  return result.rows[0];
}

export async function getAvailability(
  amenityId:  string,
  buildingId: string,
  date:       string
) {
  // 1. Get the amenity to know its schedule
  const amenity = await getAmenityById(amenityId, buildingId);

  if (!amenity.is_active) {
    throw new Error('AMENITY_NOT_ACTIVE');
  }

  // 2. Generate all possible slots for this day
  const allSlots = generateTimeSlots(
    amenity.open_time,
    amenity.close_time,
    amenity.slot_duration_mins
  );

  // 3. Find all confirmed bookings for this amenity on this date.
  const bookingsResult = await pool.query(
    `SELECT start_time, end_time
     FROM bookings
     WHERE amenity_id  = $1
       AND booking_date = $2
       AND status != 'cancelled'`,
    [amenityId, date]
  );

  const bookedSlots = bookingsResult.rows;

  // 4. For each slot, check if it overlaps with any existing booking.
  const availability = allSlots.map(slotStart => {
    const [sh, sm]  = slotStart.split(':').map(Number);
    const slotStartMins = sh * 60 + sm;
    const slotEndMins   = slotStartMins + amenity.slot_duration_mins;

    const slotEnd = `${String(Math.floor(slotEndMins / 60)).padStart(2, '0')}:${String(slotEndMins % 60).padStart(2, '0')}`;

    const isBooked = bookedSlots.some(booking => {
      const [bsh, bsm] = booking.start_time.slice(0, 5).split(':').map(Number);
      const [beh, bem] = booking.end_time.slice(0, 5).split(':').map(Number);
      const bookingStartMins = bsh * 60 + bsm;
      const bookingEndMins   = beh * 60 + bem;

      // Overlap if booking starts before slot ends AND booking ends after slot starts
      return bookingStartMins < slotEndMins && bookingEndMins > slotStartMins;
    });

    return {
      start_time: slotStart,
      end_time:   slotEnd,
      available:  !isBooked,
    };
  });

  return {
    amenity_id:   amenityId,
    date,
    slots: availability,
  };
}