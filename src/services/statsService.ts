import { pool } from '../db/pool';

// Overview stats

export async function getOverview(buildingId: string) {
  // Total bookings this month
  const totalResult = await pool.query(
    `SELECT COUNT(*) AS total_bookings
     FROM bookings b
     JOIN amenities a ON b.amenity_id = a.id
     WHERE a.building_id = $1
       AND b.status != 'cancelled'
       AND DATE_TRUNC('month', b.booking_date) = DATE_TRUNC('month', CURRENT_DATE)`,
    [buildingId]
  );

  // Most booked amenity overall
  const mostBookedResult = await pool.query(
    `SELECT
       a.name,
       COUNT(b.id) AS booking_count
     FROM bookings b
     JOIN amenities a ON b.amenity_id = a.id
     WHERE a.building_id = $1
       AND b.status != 'cancelled'
     GROUP BY a.id, a.name
     ORDER BY booking_count DESC
     LIMIT 1`,
    [buildingId]
  );

  // Busiest day of the week (0=Sunday, 6=Saturday)
  const busiestDayResult = await pool.query(
    `SELECT
       TO_CHAR(b.booking_date, 'Day') AS day_name,
       COUNT(*)                        AS booking_count
     FROM bookings b
     JOIN amenities a ON b.amenity_id = a.id
     WHERE a.building_id = $1
       AND b.status != 'cancelled'
     GROUP BY TO_CHAR(b.booking_date, 'Day'), EXTRACT(DOW FROM b.booking_date)
     ORDER BY booking_count DESC
     LIMIT 1`,
    [buildingId]
  );

  // Cancellation rate
  const cancellationResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
       COUNT(*)                                        AS total
     FROM bookings b
     JOIN amenities a ON b.amenity_id = a.id
     WHERE a.building_id = $1`,
    [buildingId]
  );

  const { cancelled, total } = cancellationResult.rows[0];
  const cancellationRate = total > 0
    ? Math.round((cancelled / total) * 100)
    : 0;

  return {
    total_bookings_this_month: Number(totalResult.rows[0].total_bookings),
    most_booked_amenity:       mostBookedResult.rows[0] ?? null,
    busiest_day:               busiestDayResult.rows[0] ?? null,
    cancellation_rate_percent: cancellationRate,
  };
}

// Amenity utilization

export async function getAmenityStats(buildingId: string) {
  // For each amenity, this part calculates:
  // - total confirmed bookings
  // - total possible slots in the last 30 days
  // - utilization rate = booked / possible * 100
  const result = await pool.query(
    `WITH amenity_bookings AS (
       SELECT
         a.id,
         a.name,
         a.open_time,
         a.close_time,
         a.slot_duration_mins,
         COUNT(b.id) FILTER (WHERE b.status != 'cancelled') AS confirmed_bookings,
         COUNT(b.id) FILTER (WHERE b.status  = 'cancelled') AS cancelled_bookings
       FROM amenities a
       LEFT JOIN bookings b ON b.amenity_id = a.id
         AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days'
       WHERE a.building_id = $1
       GROUP BY a.id, a.name, a.open_time, a.close_time, a.slot_duration_mins
     )
     SELECT
       id,
       name,
       confirmed_bookings,
       cancelled_bookings,
       -- Calculate total possible slots per day
       -- then multiply by 30 days
       FLOOR(
         EXTRACT(EPOCH FROM (close_time - open_time)) / 60
         / slot_duration_mins
       ) * 30 AS total_possible_slots,
       CASE
         WHEN FLOOR(
           EXTRACT(EPOCH FROM (close_time - open_time)) / 60
           / slot_duration_mins
         ) * 30 = 0 THEN 0
         ELSE ROUND(
           confirmed_bookings::numeric /
           (FLOOR(
             EXTRACT(EPOCH FROM (close_time - open_time)) / 60
             / slot_duration_mins
           ) * 30) * 100,
           1
         )
       END AS utilization_rate_percent
     FROM amenity_bookings
     ORDER BY confirmed_bookings DESC`,
    [buildingId]
  );

  return result.rows;
}

// Peak hours
export async function getPeakHours(buildingId: string) {
  // Count bookings per hour across all amenities.
  // EXTRACT(HOUR FROM start_time) pulls the hour from the time column.
  const result = await pool.query(
    `SELECT
       EXTRACT(HOUR FROM b.start_time)::int AS hour,
       TO_CHAR(b.start_time, 'HH12:MI AM')  AS hour_label,
       COUNT(*)                              AS booking_count
     FROM bookings b
     JOIN amenities a ON b.amenity_id = a.id
     WHERE a.building_id = $1
       AND b.status != 'cancelled'
     GROUP BY EXTRACT(HOUR FROM b.start_time), TO_CHAR(b.start_time, 'HH12:MI AM')
     ORDER BY hour ASC`,
    [buildingId]
  );

  return result.rows;
}

// Monthly trends
export async function getMonthlyTrends(buildingId: string) {
  // DATE_TRUNC groups bookings by month.
  // Shows the last 6 months of booking activity.
  const result = await pool.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', b.booking_date), 'YYYY-MM') AS month,
       COUNT(*) FILTER (WHERE b.status != 'cancelled')          AS confirmed,
       COUNT(*) FILTER (WHERE b.status  = 'cancelled')          AS cancelled
     FROM bookings b
     JOIN amenities a ON b.amenity_id = a.id
     WHERE a.building_id = $1
       AND b.booking_date >= CURRENT_DATE - INTERVAL '6 months'
     GROUP BY DATE_TRUNC('month', b.booking_date)
     ORDER BY month ASC`,
    [buildingId]
  );

  return result.rows;
}

//Resident activity
export async function getResidentStats(buildingId: string) {
  // Most active residents with their booking counts and cancellation rates.
  // Uses a subquery to calculate per-user stats then joins with users table.
  const result = await pool.query(
    `SELECT
       u.name,
       u.email,
       COUNT(b.id) FILTER (WHERE b.status != 'cancelled') AS confirmed_bookings,
       COUNT(b.id) FILTER (WHERE b.status  = 'cancelled') AS cancelled_bookings,
       COUNT(b.id)                                         AS total_bookings,
       -- Favourite amenity: subquery finds the most booked amenity per user
       (
         SELECT a2.name
         FROM bookings b2
         JOIN amenities a2 ON b2.amenity_id = a2.id
         WHERE b2.user_id = u.id
           AND b2.status != 'cancelled'
         GROUP BY a2.name
         ORDER BY COUNT(*) DESC
         LIMIT 1
       ) AS favourite_amenity
     FROM users u
     LEFT JOIN bookings b ON b.user_id = u.id
     WHERE u.building_id = $1
       AND u.role = 'resident'
     GROUP BY u.id, u.name, u.email
     ORDER BY confirmed_bookings DESC`,
    [buildingId]
  );

  return result.rows;
}