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