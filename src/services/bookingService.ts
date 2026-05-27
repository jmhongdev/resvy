import { pool } from '../db/pool';

//Types
export interface CreateBookingInput {
  amenity_id:   string;
  booking_date: string;
  start_time:   string;
  end_time:     string;
  notes?:       string;
}

// Service functions
export async function createBooking(
  userId:     string,
  buildingId: string,
  input:      CreateBookingInput
) {
  const { amenity_id, booking_date, start_time, end_time, notes } = input;

  // Use a client from the pool to run a transaction.
  // Prevents double bookings.
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify the amenity exists and belongs to the user's building
    const amenityResult = await client.query(
      `SELECT id, is_active, open_time, close_time, max_advance_days
       FROM amenities
       WHERE id = $1 AND building_id = $2`,
      [amenity_id, buildingId]
    );

    if (amenityResult.rows.length === 0) {
      throw new Error('AMENITY_NOT_FOUND');
    }

    const amenity = amenityResult.rows[0];

    if (!amenity.is_active) {
      throw new Error('AMENITY_NOT_ACTIVE');
    }

    // 2. Check the booking is not in the past
    const today = new Date();
    const bookingDate = new Date(booking_date);
    const daysDiff = Math.ceil(
      (bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check the full datetime — not just the date
    // This prevents booking a slot earlier today that has already passed
    const bookingEndDateTime = new Date(`${booking_date}T${end_time}:00`);

    if (bookingEndDateTime < today) {
      throw new Error('PAST_SLOT');
    }

    if (daysDiff > amenity.max_advance_days) {
      throw new Error('TOO_FAR_IN_ADVANCE');
    }

    // 3. Check for conflicting bookings
    // Two bookings overlap if one starts before the other ends AND ends after the other starts.
    const conflictResult = await client.query(
      `SELECT id FROM bookings
       WHERE amenity_id    = $1
         AND booking_date  = $2
         AND status       != 'cancelled'
         AND start_time    < $3
         AND end_time      > $4
       FOR UPDATE`,
      [amenity_id, booking_date, end_time, start_time]
    );

    if (conflictResult.rows.length > 0) {
      throw new Error('SLOT_ALREADY_BOOKED');
    }

    // 4. Check user doesn't already have a booking for this amenity on this date
    const userConflict = await client.query(
      `SELECT id FROM bookings
       WHERE user_id      = $1
         AND amenity_id   = $2
         AND booking_date = $3
         AND status      != 'cancelled'`,
      [userId, amenity_id, booking_date]
    );

    if (userConflict.rows.length > 0) {
      throw new Error('USER_ALREADY_BOOKED');
    }

    // 5. Insert the booking
    const bookingResult = await client.query(
      `INSERT INTO bookings
         (user_id, amenity_id, booking_date, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, amenity_id, booking_date, start_time, end_time, notes ?? null]
    );

    const booking = bookingResult.rows[0];

    // 6. Log the creation in booking_history
    await client.query(
      `INSERT INTO booking_history (booking_id, action, changed_by)
       VALUES ($1, 'created', $2)`,
      [booking.id, userId]
    );

    await client.query('COMMIT');

    return booking;
  } catch (error) {
    // If anything went wrong, roll back changes
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

export async function getMyBookings(userId: string) {
  // Join bookings with amenities to get amenity name and location.
  // Split into upcoming and past bookings using booking_date comparison.
  const result = await pool.query(
    `SELECT
       b.id,
       b.booking_date,
       b.start_time,
       b.end_time,
       b.status,
       b.notes,
       b.created_at,
       a.name     AS amenity_name,
       a.location AS amenity_location,
       CASE
         WHEN b.booking_date >= CURRENT_DATE THEN 'upcoming'
         ELSE 'past'
       END AS period
     FROM bookings b
     JOIN amenities a ON b.amenity_id = a.id
     WHERE b.user_id = $1
     ORDER BY b.booking_date DESC, b.start_time DESC`,
    [userId]
  );

  // Separate into upcoming and past
  const upcoming = result.rows.filter(b => b.period === 'upcoming');
  const past     = result.rows.filter(b => b.period === 'past');

  return { upcoming, past };
}

export async function cancelBooking(
  bookingId:  string,
  userId:     string,
  buildingId: string,
  userRole:   string
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Find the booking and verify ownership
    const bookingResult = await client.query(
      `SELECT b.id, b.status, b.booking_date, b.user_id
       FROM bookings b
       JOIN amenities a ON b.amenity_id = a.id
       WHERE b.id = $1 AND a.building_id = $2`,
      [bookingId, buildingId]
    );

    if (bookingResult.rows.length === 0) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    const booking = bookingResult.rows[0];

    // 2. Admins can cancel any booking in their building
    // Residents can only cancel their own
    if (userRole !== 'admin' && booking.user_id !== userId) {
      throw new Error('UNAUTHORIZED');
    }

    // 3. Can't cancel an already cancelled booking
    if (booking.status === 'cancelled') {
      throw new Error('ALREADY_CANCELLED');
    }

    // 4. Can't cancel a past booking
    const bookingDate = new Date(booking.booking_date);
    const today       = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new Error('PAST_BOOKING');
    }

    // 5. Update status to cancelled
    const updated = await client.query(
      `UPDATE bookings
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    // 6. Log the cancellation
    await client.query(
      `INSERT INTO booking_history (booking_id, action, changed_by)
       VALUES ($1, 'cancelled', $2)`,
      [bookingId, userId]
    );

    await client.query('COMMIT');

    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getAdminBookings(
  buildingId: string,
  filters: {
    amenity_id?: string;
    date?:       string;
    status?:     string;
  }
) {
  // Build dynamic WHERE clause based on provided filters
  const conditions: string[] = ['a.building_id = $1'];
  const values:     unknown[] = [buildingId];
  let   paramIndex = 2;

  if (filters.amenity_id) {
    conditions.push(`b.amenity_id = $${paramIndex++}`);
    values.push(filters.amenity_id);
  }

  if (filters.date) {
    conditions.push(`b.booking_date = $${paramIndex++}`);
    values.push(filters.date);
  }

  if (filters.status) {
    conditions.push(`b.status = $${paramIndex++}`);
    values.push(filters.status);
  }

  const whereClause = conditions.join(' AND ');

  const result = await pool.query(
    `SELECT
       b.id,
       b.booking_date,
       b.start_time,
       b.end_time,
       b.status,
       b.notes,
       b.created_at,
       a.name       AS amenity_name,
       a.location   AS amenity_location,
       u.name       AS resident_name,
       u.email      AS resident_email
     FROM bookings b
     JOIN amenities a ON b.amenity_id = a.id
     JOIN users     u ON b.user_id    = u.id
     WHERE ${whereClause}
     ORDER BY b.booking_date DESC, b.start_time DESC`,
    values
  );

  return result.rows;
}