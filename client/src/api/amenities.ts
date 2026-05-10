import { apiClient } from './client';

export interface Amenity {
  id:                 string;
  name:               string;
  description:        string;
  capacity:           number;
  location:           string;
  is_active:          boolean;
  open_time:          string;
  close_time:         string;
  slot_duration_mins: number;
  max_advance_days:   number;
}

export interface TimeSlot {
  start_time: string;
  end_time:   string;
  available:  boolean;
}

export interface AvailabilityResult {
  amenity_id: string;
  date:       string;
  slots:      TimeSlot[];
}

export async function getAmenities(): Promise<Amenity[]> {
  return apiClient.get<Amenity[]>('/amenities');
}

export async function getAmenity(id: string): Promise<Amenity> {
  return apiClient.get<Amenity>(`/amenities/${id}`);
}

export async function getAvailability(
  id:   string,
  date: string
): Promise<AvailabilityResult> {
  return apiClient.get<AvailabilityResult>(
    `/amenities/${id}/availability?date=${date}`
  );
}