import { apiClient } from './client';

// Types

export interface Booking {
  id:               string;
  booking_date:     string;
  start_time:       string;
  end_time:         string;
  status:           'confirmed' | 'cancelled' | 'completed';
  notes?:           string;
  amenity_name:     string;
  amenity_location: string;
  created_at:       string;
}

export interface MyBookings {
  upcoming: Booking[];
  past:     Booking[];
}

export interface AdminBooking {
  id:               string;
  booking_date:     string;
  start_time:       string;
  end_time:         string;
  status:           'confirmed' | 'cancelled' | 'completed';
  notes?:           string;
  amenity_name:     string;
  amenity_location: string;
  resident_name:    string;
  resident_email:   string;
  created_at:       string;
}

export interface AdminBookingFilters {
  amenity_id?: string;
  date?:       string;
  status?:     string;
}

// API functions

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

  const today    = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  return result.upcoming.filter(b => {
    const bookingDate = b.booking_date.slice(0, 10);
    return bookingDate === todayStr && b.status === 'confirmed';
  });
}

export async function getAdminBookings(
  filters: AdminBookingFilters = {}
): Promise<AdminBooking[]> {
  const params = new URLSearchParams();
  if (filters.amenity_id) params.set('amenity_id', filters.amenity_id);
  if (filters.date)       params.set('date',       filters.date);
  if (filters.status)     params.set('status',     filters.status);

  const query = params.toString();
  const url   = query ? `/bookings/admin?${query}` : '/bookings/admin';

  return apiClient.get<AdminBooking[]>(url);
}