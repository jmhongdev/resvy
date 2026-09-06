import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAmenities } from '../api/amenities';
import type { Amenity, AmenityFilters } from '../api/amenities';
import { useAuth } from '../context/useAuth';
import { getTodaysBookings } from '../api/bookings';
import type { Booking } from '../api/bookings';


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


  useEffect(() => {
    async function init() {
      await loadAmenities({});
    }
    init();
  }, [loadAmenities]);

  useEffect(() => {
    async function loadTodaysBookings() {
      try {
        const data = await getTodaysBookings();
        setTodaysBookings(data);
      } catch {
        // Silently fail
      }
    }
    loadTodaysBookings();
  }, []);

  function handleSearch() {
    const filters: AmenityFilters = {};
    if (search)         filters.search          = search;
    if (minCapacity)    filters.min_capacity    = Number(minCapacity);
    if (availableToday) filters.available_today = true;
    loadAmenities(filters);
  }

  function handleReset() {
    setSearch('');
    setMinCapacity('');
    setAvailableToday(false);
    loadAmenities({});
  }

  return (
    <div style={styles.page}>
      {/* Today's booking banner */}
      {!isAdmin && todaysBookings.length > 0 && (
        <div style={styles.banner}>
          <div style={styles.bannerLeft}>
            <span style={styles.bannerIcon}>📅</span>
            <div>
              <p style={styles.bannerTitle}>
                You have {todaysBookings.length} booking{todaysBookings.length > 1 ? 's' : ''} today
              </p>
              <div style={styles.bannerBookings}>
                {todaysBookings.map(b => (
                  <span key={b.id} style={styles.bannerBookingItem}>
                    {b.amenity_name} · {b.start_time.slice(0,5)} — {b.end_time.slice(0,5)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Link to="/my-bookings" style={styles.bannerLink}>
            View all →
          </Link>
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>Amenities</h1>
        <p style={styles.subtitle}>Book a shared space in your building</p>
      </div>

      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search amenities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={styles.searchInput}
        />

        <select
          value={minCapacity}
          onChange={e => setMinCapacity(e.target.value)}
          style={styles.select}
        >
          <option value="">Any capacity</option>
          <option value="5">5+ people</option>
          <option value="10">10+ people</option>
          <option value="15">15+ people</option>
          <option value="20">20+ people</option>
        </select>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={availableToday}
            onChange={e => setAvailableToday(e.target.checked)}
          />
          Available today
        </label>

        <button onClick={handleSearch} style={styles.searchBtn}>
          Search
        </button>

        <button onClick={handleReset} style={styles.resetBtn}>
          Reset
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.center}>Loading amenities...</div>
      ) : amenities.length === 0 ? (
        <div style={styles.center}>No amenities found.</div>
      ) : (
        <div style={styles.grid}>
          {amenities.map(amenity => (
            <div key={amenity.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.amenityName}>{amenity.name}</h2>
                <span style={styles.capacity}>최대 {amenity.capacity}명</span>
              </div>

              {amenity.description && (
                <p style={styles.description}>{amenity.description}</p>
              )}

              <div style={styles.details}>
                {amenity.location && (
                  <span style={styles.detail}>📍 {amenity.location}</span>
                )}
                <span style={styles.detail}>
                  🕐 {amenity.open_time.slice(0,5)} — {amenity.close_time.slice(0,5)}
                </span>
                <span style={styles.detail}>
                  ⏱ {amenity.slot_duration_mins}분 단위
                </span>
              </div>

              {!isAdmin && (
                <button
                  style={styles.bookBtn}
                  onClick={() => navigate(`/amenities/${amenity.id}/availability`)}
                >
                  예약하기
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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