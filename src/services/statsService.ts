import { pool } from '../db/pool';

// Return type interfaces

export interface OverviewStats {
  total_bookings_this_month: number;
  most_booked_amenity:       { name: string; booking_count: number } | null;
  busiest_day:               { day_name: string; booking_count: number } | null;
  cancellation_rate_percent: number;
}

export interface AmenityStat {
  id:                       string;
  name:                     string;
  confirmed_bookings:       number;
  cancelled_bookings:       number;
  total_possible_slots:     number;
  utilization_rate_percent: number;
}

export interface PeakHour {
  hour:          number;
  hour_label:    string;
  booking_count: number;
}

export interface MonthlyTrend {
  month:     string;
  confirmed: number;
  cancelled: number;
}

export interface ResidentStat {
  name:               string;
  email:              string;
  confirmed_bookings: number;
  cancelled_bookings: number;
  total_bookings:     number;
  favourite_amenity:  string | null;
}

// Service functions

export async function getOverview(buildingId: string): Promise<OverviewStats> {
  // Run all queries in parallel — reduces latency from sequential to concurrent
  const [totalResult, mostBookedResult, busiestDayResult, cancellationResult] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total_bookings
         FROM bookings b
         JOIN amenities a ON b.amenity_id = a.id
         WHERE a.building_id = $1
           AND b.status != 'cancelled'
           AND DATE_TRUNC('month', b.booking_date) = DATE_TRUNC('month', CURRENT_DATE)`,
        [buildingId]
      ),
      pool.query(
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
      ),
      pool.query(
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
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
           COUNT(*)                                        AS total
         FROM bookings b
         JOIN amenities a ON b.amenity_id = a.id
         WHERE a.building_id = $1`,
        [buildingId]
      ),
    ]);

  // Explicit Number() conversion, pg returns COUNT as string
  const cancelled = Number(cancellationResult.rows[0].cancelled);
  const total     = Number(cancellationResult.rows[0].total);
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

export async function getAmenityStats(buildingId: string): Promise<AmenityStat[]> {
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

export async function getPeakHours(buildingId: string): Promise<PeakHour[]> {
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

export async function getMonthlyTrends(buildingId: string): Promise<MonthlyTrend[]> {
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

export async function getResidentStats(buildingId: string): Promise<ResidentStat[]> {
  // Uses LATERAL JOIN instead of correlated subquery to avoid N+1 problem
  const result = await pool.query(
    `SELECT
       u.name,
       u.email,
       COUNT(b.id) FILTER (WHERE b.status != 'cancelled') AS confirmed_bookings,
       COUNT(b.id) FILTER (WHERE b.status  = 'cancelled') AS cancelled_bookings,
       COUNT(b.id)                                         AS total_bookings,
       fav.name                                            AS favourite_amenity
     FROM users u
     LEFT JOIN bookings b ON b.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT a2.name
       FROM bookings b2
       JOIN amenities a2 ON b2.amenity_id = a2.id
       WHERE b2.user_id = u.id
         AND b2.status != 'cancelled'
       GROUP BY a2.name
       ORDER BY COUNT(*) DESC
       LIMIT 1
     ) fav ON true
     WHERE u.building_id = $1
       AND u.role = 'resident'
     GROUP BY u.id, u.name, u.email, fav.name
     ORDER BY confirmed_bookings DESC`,
    [buildingId]
  );

  return result.rows;
}