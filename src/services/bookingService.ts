import { pool } from '../db/pool';

//Types
export interface CreateBookingInput {
  amenity_id:   string;
  booking_date: string;
  start_time:   string;
  end_time:     string;
  notes?:       string;
}

export interface AdminBookingFilters {
  amenity_id?: string;
  date?:       string;
  status?:     string;
}

// Custom error

export class BookingError extends Error {
  constructor(
    public code:    string,
    message:        string,
    public data?:   Record<string, unknown>
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

// Service functions
export async function createBooking(
  userId:     string,
  buildingId: string,
  input:      CreateBookingInput
) {
  const { amenity_id, booking_date, start_time, end_time, notes } = input;

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
      throw new BookingError('AMENITY_NOT_FOUND', 'Amenity not found');
    }

    const amenity = amenityResult.rows[0];

    if (!amenity.is_active) {
      throw new BookingError('AMENITY_NOT_ACTIVE', 'Amenity is not active');
    }

    // 2. Check the booking is not in the past
    // Compare full datetime to prevent booking same-day past slots
    const now                = new Date();
    const bookingEndDateTime = new Date(`${booking_date}T${end_time}:00`);

    if (bookingEndDateTime < now) {
      throw new BookingError('PAST_SLOT', 'Cannot book a time slot that has already passed');
    }

    // Check not too far in advance using date strings to avoid timezone issues
    const todayStr   = now.toISOString().split('T')[0];
    const todayDate  = new Date(todayStr);
    const bookingDay = new Date(booking_date);
    const daysDiff   = Math.round(
      (bookingDay.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > amenity.max_advance_days) {
      throw new BookingError('TOO_FAR_IN_ADVANCE', 'Booking too far in advance', {
        maxDays: amenity.max_advance_days,
      });
    }

    // 3. Check for conflicting bookings with row lock to prevent race conditions
    const conflictResult = await client.query(
      `SELECT id FROM bookings
       WHERE amenity_id   = $1
         AND booking_date = $2
         AND status      != 'cancelled'
         AND start_time   < $3
         AND end_time     > $4
       FOR UPDATE`,
      [amenity_id, booking_date, end_time, start_time]
    );

    if (conflictResult.rows.length > 0) {
      throw new BookingError('SLOT_ALREADY_BOOKED', 'This slot is already booked');
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
      throw new BookingError('USER_ALREADY_BOOKED', 'You already have a booking for this amenity on this date');
    }

    // 5. Insert the booking
    const bookingResult = await client.query(
      `INSERT INTO bookings
         (user_id, amenity_id, booking_date, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, amenity_id,
                 TO_CHAR(booking_date, 'YYYY-MM-DD') AS booking_date,
                 TO_CHAR(start_time,   'HH24:MI')    AS start_time,
                 TO_CHAR(end_time,     'HH24:MI')    AS end_time,
                 status, notes, created_at`,
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
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getMyBookings(userId: string) {
  const result = await pool.query(
    `SELECT
       b.id,
       TO_CHAR(b.booking_date, 'YYYY-MM-DD') AS booking_date,
       TO_CHAR(b.start_time,   'HH24:MI')    AS start_time,
       TO_CHAR(b.end_time,     'HH24:MI')    AS end_time,
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

    // 1. Find the booking and verify it belongs to this building
    const bookingResult = await client.query(
      `SELECT b.id, b.status, b.booking_date, b.user_id
       FROM bookings b
       JOIN amenities a ON b.amenity_id = a.id
       WHERE b.id = $1 AND a.building_id = $2`,
      [bookingId, buildingId]
    );

    if (bookingResult.rows.length === 0) {
      throw new BookingError('BOOKING_NOT_FOUND', 'Booking not found');
    }

    const booking = bookingResult.rows[0];

    // 2. Admins can cancel any booking in their building
    //    Residents can only cancel their own booking
    if (userRole !== 'admin' && booking.user_id !== userId) {
      throw new BookingError('UNAUTHORIZED', 'You can only cancel your own bookings');
    }

    // 3. Can't cancel an already cancelled booking
    if (booking.status === 'cancelled') {
      throw new BookingError('ALREADY_CANCELLED', 'Booking is already cancelled');
    }

    // 4. Can't cancel a past booking
    const bookingDate = new Date(booking.booking_date);
    const today       = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new BookingError('PAST_BOOKING', 'Cannot cancel a past booking');
    }

    // 5. Update status
    const updated = await client.query(
      `UPDATE bookings
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING id, status,
                 TO_CHAR(booking_date, 'YYYY-MM-DD') AS booking_date,
                 TO_CHAR(start_time,   'HH24:MI')    AS start_time,
                 TO_CHAR(end_time,     'HH24:MI')    AS end_time`,
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
  filters:    AdminBookingFilters = {}
) {
  const conditions: string[]  = ['a.building_id = $1'];
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

  const result = await pool.query(
    `SELECT
       b.id,
       TO_CHAR(b.booking_date, 'YYYY-MM-DD') AS booking_date,
       TO_CHAR(b.start_time,   'HH24:MI')    AS start_time,
       TO_CHAR(b.end_time,     'HH24:MI')    AS end_time,
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
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.booking_date DESC, b.start_time DESC`,
    values
  );

  return result.rows;
}