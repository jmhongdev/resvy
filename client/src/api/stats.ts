import { apiClient } from './client';

export interface OverviewStats {
  total_bookings_this_month: number;
  most_booked_amenity:       { name: string; booking_count: number } | null;
  busiest_day:               { day_name: string; booking_count: number } | null;
  cancellation_rate_percent: number;
}

export interface AmenityStat {
  name:                     string;
  confirmed_bookings:       number;
  total_possible_slots:     number;
  utilization_rate_percent: number;
}

export interface PeakHour {
  hour:          number;
  hour_label:    string;
  booking_count: number;
}

export async function getOverview(): Promise<OverviewStats> {
  return apiClient.get<OverviewStats>('/stats/overview');
}

export async function getAmenityStats(): Promise<AmenityStat[]> {
  return apiClient.get<AmenityStat[]>('/stats/amenities');
}

export async function getPeakHours(): Promise<PeakHour[]> {
  return apiClient.get<PeakHour[]>('/stats/peak-hours');
}