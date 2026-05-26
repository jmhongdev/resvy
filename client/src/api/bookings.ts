import { apiClient } from './client';

export interface Booking {
  id:               string;
  booking_date:     string;
  start_time:       string;
  end_time:         string;
  status:           string;
  notes?:           string;
  amenity_name:     string;
  amenity_location: string;
  created_at:       string;
}

export interface MyBookings {
  upcoming: Booking[];
  past:     Booking[];
}

export async function createBooking(
  amenity_id:   string,
  booking_date: string,
  start_time:   string,
  end_time:     string,
  notes?:       string
): Promise<Booking> {
  return apiClient.post<Booking>('/bookings', {
    amenity_id, booking_date, start_time, end_time, notes,
  });
}

export async function getMyBookings(): Promise<MyBookings> {
  return apiClient.get<MyBookings>('/bookings/my');
}

export async function cancelBooking(id: string): Promise<Booking> {
  return apiClient.patch<Booking>(`/bookings/${id}/cancel`);
}

export async function getTodaysBookings(): Promise<Booking[]> {
  const result = await getMyBookings();

  // Get today's date in local timezone — not UTC
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  console.log('today local:', todayStr);

  return result.upcoming.filter(b => {
    // booking_date comes as "2026-05-24T15:00:00.000Z"
    // Extract just the date portion from the raw string
    const bookingDate = b.booking_date.slice(0, 10);
    console.log('booking date:', bookingDate, 'matches:', bookingDate === todayStr);
    return bookingDate === todayStr && b.status === 'confirmed';
  });
}