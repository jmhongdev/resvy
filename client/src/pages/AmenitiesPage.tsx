import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAmenities } from '../api/amenities';
import type { Amenity, AmenityFilters } from '../api/amenities';
import { useAuth } from '../context/useAuth';

export default function AmenitiesPage() {
  const navigate          = useNavigate();
  const { isAdmin }       = useAuth();
  const [amenities,  setAmenities]  = useState<Amenity[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Filter state
  const [search,         setSearch]         = useState('');
  const [minCapacity,    setMinCapacity]     = useState('');
  const [availableToday, setAvailableToday] = useState(false);

  // useCallback memoizes the function so it doesn't
  // get recreated on every render
  const loadAmenities = useCallback(async (filters: AmenityFilters) => {
    setLoading(true);
    setError('');
    try {
      const data = await getAmenities(filters);
      setAmenities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load amenities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await loadAmenities({});
    }
    init();
  }, [loadAmenities]);

  // Apply filters
  function handleSearch() {
    const filters: AmenityFilters = {};
    if (search)         filters.search          = search;
    if (minCapacity)    filters.min_capacity    = Number(minCapacity);
    if (availableToday) filters.available_today = true;
    loadAmenities(filters);
  }

  // Reset all filters
  function handleReset() {
    setSearch('');
    setMinCapacity('');
    setAvailableToday(false);
    loadAmenities({});
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Amenities</h1>
        <p style={styles.subtitle}>Book a shared space in your building</p>
      </div>

      {/* Filter bar */}
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
    display:     'flex',
    alignItems:  'center',
    gap:         '0.75rem',
    marginBottom: '1.5rem',
    flexWrap:    'wrap',
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
};