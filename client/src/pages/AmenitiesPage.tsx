import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getAmenities } from '../api/amenities';
import type {
  Amenity,
  AmenityFilters,
} from '../api/amenities';
import { getTodaysBookings } from '../api/bookings';
import type { Booking } from '../api/bookings';
import { useAuth } from '../context/useAuth';


type CapacityFilter = '' | '5' | '10' | '15' | '20';

// Keep API error handling consistent and preserver useful timeout network, and backend messages.
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Form controls store strings, while the API expects a numeric capacity and comitted empty values. Building the request in one typed helper keeps conversaion and search trimming out the component's request handlers
function buildFilters(
  search: string,
  minCapacity: CapacityFilter,
  availableToday: boolean
): AmenityFilters {
  const normalizedSearch = search.trim();
  const capacity = minCapacity ? Number(minCapacity) : null;

  return {
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(capacity !== null ? { min_capacity: capacity } : {}),
    ...(availableToday ? { available_today: true } : {}),
  };
}

function hasFilters(filters: AmenityFilters): boolean {
  return Boolean(
    filters.search || filters.min_capacity || filters.available_today
  );
}

export default function AmenitiesPage() {
  const { isAdmin } = useAuth();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [todaysBookings, setTodaysBookings] = useState<Booking[]>([]);

  //Amenity serach and today's booking summary are independent resources. Their errors should not overwrite eachtoher, and a banner failure should not prevent the primary amenity catalogue from rendering.
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [amenitiesError, setAmenitiesError] = useState('');
  const [todaysBookingsError, setTodaysBookingsError] = useState('');

  //Editable draft controls. appliedFilters cahnges only after a successful response. The empty-state copy always describes the data currently on the screen
  const [search, setSearch] = useState('');
  const [minCapacity, setMinCapacity] = useState<CapacityFilter>('');
  const [availableToday, setAvailableToday] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AmenityFilters>({});
  
  //Every catalogue request receives an increasing ID. Only the latest request may update shared state, preventing a slow older search from replacing a newer result after rapid submissions or refreshes.
  const amenityRequestIdRef = useRef(0);
  
  //Initial catalogue request updates state only after the external request settles and ignores late results after navigation/ Strict Mode cleanup.
  //Later event driven searches use loadAmenities

  useEffect(() => {
    let active = true;
    const requestId = ++amenityRequestIdRef.current;

    async function loadInitialAmenities() {
      try {
        const data = await getAmenities();
        if (active && requestId === amenityRequestIdRef.current) {
          setAmenities(data);
          setAppliedFilters({});
        }
      } catch (error) {
        if (active && requestId === amenityRequestIdRef.current) {
          setAmenitiesError(getErrorMessage(error, 'Failed to load amenities'));
        }
      } finally {
        if (active && requestId === amenityRequestIdRef.current) {
          setLoadingAmenities(false);
        }
      }
    }

    void loadInitialAmenities();

    return () => {
      active = false;
    };
  }, []);

  //Admins never see the resident booking banner, so not all admin user's bookings are fetched. Resident failures are surfaced as a non-blocking warning instead of silently pretending there are no bookings today.
  useEffect(() => {
    if (isAdmin) return;

    let active = true;

    async function loadResidentBookings() {
      try {
        const data = await getTodaysBookings();
        if (active) setTodaysBookings(data);
      } catch (error) {
        if (active) {
          setTodaysBookingsError(
            getErrorMessage(error, "Failed to load today's booking summary")
          );
        }
      }
    }

    void loadResidentBookings();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  async function loadAmenities(filters: AmenityFilters) {
    const requestId = ++amenityRequestIdRef.current;
    setLoadingAmenities(true);
    setAmenitiesError('');

    // Clear rows while searching so draft controls and old applied results cannot appear to describe each other. A failed search then shows an error, not stale cards that came from a different filter set.
    setAmenities([]);

    try {
      const data = await getAmenities(filters);
      if (requestId !== amenityRequestIdRef.current) return;

      setAmenities(data);
      setAppliedFilters(filters);
    } catch (error) {
      if (requestId === amenityRequestIdRef.current) {
        setAmenitiesError(getErrorMessage(error, 'Failed to load amenities'));
      }
    } finally {
      if (requestId === amenityRequestIdRef.current) {
        setLoadingAmenities(false);
      }
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadAmenities(buildFilters(search, minCapacity, availableToday));
  }

  function handleReset() {
    setSearch('');
    setMinCapacity('');
    setAvailableToday(false);
    void loadAmenities({});
  }

  return (
    //Main, aside, form, list, and article semantics added.
    <main style={styles.page}>
      {!isAdmin && todaysBookingsError && (
        <div style={styles.warning} role="alert">
          {todaysBookingsError}. You can still check{' '}
          <Link to="/my-bookings" style={styles.inlineLink}>My Bookings</Link>.
        </div>
      )}

      {!isAdmin && todaysBookings.length > 0 && (
        <aside style={styles.banner} aria-labelledby="today-bookings-heading">
          <div style={styles.bannerLeft}>
            <span style={styles.bannerIcon} aria-hidden="true">📅</span>
            <div>
              <h2 id="today-bookings-heading" style={styles.bannerTitle}>
                You have {todaysBookings.length} booking
                {todaysBookings.length === 1 ? '' : 's'} today
              </h2>
              <ul style={styles.bannerBookings}>
                {todaysBookings.map(booking => (
                  <li key={booking.id} style={styles.bannerBookingItem}>
                    {booking.amenity_name}: {booking.start_time.slice(0, 5)} -{' '}
                    {booking.end_time.slice(0, 5)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Link to="/my-bookings" style={styles.bannerLink}>
            View all <span aria-hidden="true">→</span>
          </Link>
        </aside>
      )}

      <header style={styles.header}>
        <h1 style={styles.title}>Amenities</h1>
        <p style={styles.subtitle}>
          {isAdmin
            ? 'View shared spaces in your building'
            : 'Book a shared space in your building'}
        </p>
      </header>

      {/* A real form gives every field a programmatic label. Enter submit from any control without maintaining a custom keydown handler. */}
      <form onSubmit={handleSearch} style={styles.filterBar} aria-label="Amenity filters">
        <div style={{ ...styles.filterField, ...styles.searchField }}>
          <label htmlFor="amenity-search" style={styles.label}>Search</label>
          <input
            id="amenity-search"
            type="search"
            placeholder="Search amenities..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            style={styles.searchInput}
            maxLength={200}
            disabled={loadingAmenities}
          />
        </div>

        <div style={styles.filterField}>
          <label htmlFor="amenity-capacity" style={styles.label}>Minimum capacity</label>
          <select
            id="amenity-capacity"
            value={minCapacity}
            onChange={event => setMinCapacity(event.target.value as CapacityFilter)}
            style={styles.select}
            disabled={loadingAmenities}
          >
            <option value="">Any capacity</option>
            <option value="5">5+ people</option>
            <option value="10">10+ people</option>
            <option value="15">15+ people</option>
            <option value="20">20+ people</option>
          </select>
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={availableToday}
            onChange={event => setAvailableToday(event.target.checked)}
            disabled={loadingAmenities}
          />
          Available today
        </label>

        <button type="submit" style={styles.searchBtn} disabled={loadingAmenities}>
          Search
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={styles.resetBtn}
          disabled={loadingAmenities}
        >
          Reset
        </button>
      </form>

      {amenitiesError && (
        <div style={styles.error} role="alert">{amenitiesError}</div>
      )}

      {loadingAmenities ? (
        <div style={styles.center} role="status" aria-live="polite">
          Loading amenities...
        </div>
      ) : amenitiesError ? null : amenities.length === 0 ? (
        <div style={styles.center}>
          {hasFilters(appliedFilters)
            ? 'No amenities match the applied filters.'
            : 'No amenities are currently available.'}
        </div>
      ) : (
        <ul style={styles.grid} aria-label="Available amenities">
          {amenities.map(amenity => {
            const headingId = `amenity-${amenity.id}-heading`;

            return (
              <li key={amenity.id} style={styles.cardListItem}>
                <article style={styles.card} aria-labelledby={headingId}>
                  <div style={styles.cardHeader}>
                    <h2 id={headingId} style={styles.amenityName}>{amenity.name}</h2>
                    <span style={styles.capacity}>최대 {amenity.capacity}명</span>
                  </div>

                  {amenity.description && (
                    <p style={styles.description}>{amenity.description}</p>
                  )}

                  <ul style={styles.details} aria-label={`${amenity.name} details`}>
                    {amenity.location && (
                      <li style={styles.detail}>📍 {amenity.location}</li>
                    )}
                    <li style={styles.detail}>
                      🕐 {amenity.open_time.slice(0, 5)} - {amenity.close_time.slice(0, 5)}
                    </li>
                    <li style={styles.detail}>
                      ⏱ {amenity.slot_duration_mins}분 단위
                    </li>
                  </ul>

                  {!isAdmin && (
                    // Availability is navigation, so use a Link instead of an imperative button.
                    <Link
                      to={`/amenities/${amenity.id}/availability`}
                      style={styles.bookBtn}
                      aria-label={`${amenity.name} 예약하기`}
                    >
                      예약하기
                    </Link>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: '900px',
    margin:   '0 auto',
    padding:  '2rem 1rem',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize:   '1.75rem',
    fontWeight: 700,
    color:      '#1a1a1a',
  },
  subtitle: {
    color:     '#666',
    marginTop: '0.25rem',
  },
  filterBar: {
    display:      'flex',
    alignItems:   'center',
    gap:          '0.75rem',
    marginBottom: '1.5rem',
    flexWrap:     'wrap',
  },
  searchInput: {
    padding:      '0.5rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.9rem',
    flex:         '1',
    minWidth:     '160px',
  },
  select: {
    padding:      '0.5rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.9rem',
    background:   '#fff',
  },
  checkboxLabel: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.4rem',
    fontSize:   '0.875rem',
    color:      '#444',
    cursor:     'pointer',
  },
  searchBtn: {
    padding:      '0.5rem 1rem',
    background:   '#2563eb',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '0.875rem',
    fontWeight:   500,
  },
  resetBtn: {
    padding:      '0.5rem 1rem',
    background:   'transparent',
    color:        '#666',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.875rem',
  },
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap:                 '1rem',
  },
  card: {
    background:    '#fff',
    borderRadius:  '12px',
    padding:       '1.25rem',
    boxShadow:     '0 2px 8px rgba(0,0,0,0.06)',
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.75rem',
  },
  cardHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  amenityName: {
    fontSize:   '1.1rem',
    fontWeight: 600,
    color:      '#1a1a1a',
  },
  capacity: {
    fontSize:     '0.75rem',
    background:   '#eff6ff',
    color:        '#2563eb',
    padding:      '0.2rem 0.5rem',
    borderRadius: '12px',
    whiteSpace:   'nowrap',
  },
  description: {
    fontSize: '0.875rem',
    color:    '#555',
  },
  details: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.25rem',
  },
  detail: {
    fontSize: '0.8rem',
    color:    '#666',
  },
  bookBtn: {
    marginTop:    'auto',
    padding:      '0.625rem',
    background:   '#2563eb',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '0.9rem',
    fontWeight:   500,
  },
  error: {
    background:   '#fef2f2',
    border:       '1px solid #fecaca',
    borderRadius: '8px',
    padding:      '0.75rem',
    color:        '#dc2626',
    fontSize:     '0.875rem',
    marginBottom: '1rem',
  },
  center: {
    padding:   '3rem',
    textAlign: 'center',
    color:     '#666',
  },
  banner: {
    background:     '#eff6ff',
    border:         '1px solid #bfdbfe',
    borderRadius:   '12px',
    padding:        '1rem 1.25rem',
    marginBottom:   '1.5rem',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            '1rem',
  },
  bannerLeft: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        '0.75rem',
  },
  bannerIcon: {
    fontSize:   '1.25rem',
    flexShrink: 0,
  },
  bannerTitle: {
    fontWeight:   600,
    fontSize:     '0.9rem',
    color:        '#1e40af',
    marginBottom: '0.25rem',
  },
  bannerBookings: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.2rem',
  },
  bannerBookingItem: {
    fontSize: '0.8rem',
    color:    '#3b82f6',
  },
  bannerLink: {
    color:          '#2563eb',
    textDecoration: 'none',
    fontSize:       '0.875rem',
    fontWeight:     500,
    whiteSpace:     'nowrap',
  },
};