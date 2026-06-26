import { apiClient } from './client';

//Types

export interface Amenity {
  id:                 string;
  name:               string;
  description?:       string;
  capacity:           number;
  location?:          string;
  is_active:          boolean;
  open_time:          string;
  close_time:         string;
  slot_duration_mins: number;
  max_advance_days:   number;
}

export interface TimeSlot {
  start_time:      string;
  end_time:        string;
  capacity:        number;
  spots_remaining: number;
  available:       boolean;
}

export interface AvailabilityResult {
  amenity_id: string;
  date:       string;
  slots:      TimeSlot[];
}

export interface AmenityFilters {
  search?:          string;
  min_capacity?:    number;
  location?:        string;
  available_today?: boolean;
}

// API functions

export async function getAmenities(
  filters: AmenityFilters = {}
): Promise<Amenity[]> {
  const params = new URLSearchParams();

  if (filters.search)          params.set('search',          filters.search);
  if (filters.min_capacity)    params.set('min_capacity',    String(filters.min_capacity));
  if (filters.location)        params.set('location',        filters.location);
  if (filters.available_today) params.set('available_today', 'true');

  const query = params.toString();
  const url   = query ? `/amenities?${query}` : '/amenities';

  return apiClient.get<Amenity[]>(url);
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