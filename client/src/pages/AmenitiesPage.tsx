import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAmenities } from '../api/amenities';
import type { Amenity } from '../api/amenities';
import { useAuth } from '../context/useAuth';

export default function AmenitiesPage() {
  const navigate = useNavigate();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const data = await getAmenities();
        // Only show active amenities to residents
        setAmenities(data.filter(a => a.is_active));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load amenities');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={styles.center}>Loading amenities...</div>;
  if (error)   return <div style={styles.center}>{error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Amenities</h1>
        <p style={styles.subtitle}>Book a shared space in your building</p>
      </div>

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
    marginBottom: '2rem',
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
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap:                 '1rem',
  },
  card: {
    background:   '#fff',
    borderRadius: '12px',
    padding:      '1.25rem',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
    display:      'flex',
    flexDirection: 'column',
    gap:          '0.75rem',
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
  center: {
    padding:        '4rem',
    textAlign:      'center',
    color:          '#666',
  },
};