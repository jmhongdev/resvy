import { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../api/bookings';
import type { Booking } from '../api/bookings';

export default function MyBookingsPage() {
  const [upcoming,        setUpcoming]        = useState<Booking[]>([]);
  const [past,            setPast]            = useState<Booking[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [showCancelled,   setShowCancelled]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyBookings();

        // Only show confirmed/completed in upcoming
        setUpcoming(data.upcoming.filter(b => b.status !== 'cancelled'));

        // Past shows all records but cancelled can be toggled
        setPast(data.past);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await cancelBooking(id);
      const data = await getMyBookings();
      setUpcoming(data.upcoming.filter(b => b.status !== 'cancelled'));
      setPast(data.past);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    }
  }

  // Separate past into non-cancelled and cancelled
  const pastNormal    = past.filter(b => b.status !== 'cancelled');
  const pastCancelled = past.filter(b => b.status === 'cancelled');

  if (loading) return <div style={styles.center}>Loading bookings...</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>My Bookings</h1>

      {error && <div style={styles.error}>{error}</div>}

      {/* Upcoming */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Upcoming</h2>
        {upcoming.length === 0 ? (
          <p style={styles.empty}>No upcoming bookings.</p>
        ) : (
          upcoming.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancel={() => handleCancel(booking.id)}
              showCancel
            />
          ))
        )}
      </section>

      {/* Past */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Past</h2>
        {pastNormal.length === 0 && pastCancelled.length === 0 ? (
          <p style={styles.empty}>No past bookings.</p>
        ) : (
          <>
            {pastNormal.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}

            {/* Cancelled toggle */}
            {pastCancelled.length > 0 && (
              <>
                <button
                  onClick={() => setShowCancelled(prev => !prev)}
                  style={styles.toggleBtn}
                >
                  {showCancelled
                    ? `Hide cancelled (${pastCancelled.length})`
                    : `Show cancelled (${pastCancelled.length})`}
                </button>

                {showCancelled && pastCancelled.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  showCancel,
}: {
  booking:     Booking;
  onCancel?:   () => void;
  showCancel?: boolean;
}) {
  return (
    <div style={{
      ...styles.card,
      ...(booking.status === 'cancelled' ? styles.cardCancelled : {}),
    }}>
      <div style={styles.cardTop}>
        <div>
          <p style={{
            ...styles.amenityName,
            ...(booking.status === 'cancelled' ? styles.textMuted : {}),
          }}>
            {booking.amenity_name}
          </p>
          <p style={styles.cardDetail}>📍 {booking.amenity_location}</p>
        </div>
        <span style={{
          ...styles.statusBadge,
          ...(booking.status === 'cancelled'  ? styles.badgeCancelled  : {}),
          ...(booking.status === 'confirmed'  ? styles.badgeConfirmed  : {}),
          ...(booking.status === 'completed'  ? styles.badgeCompleted  : {}),
        }}>
          {booking.status}
        </span>
      </div>

      <div style={styles.cardDetail}>
        📅 {new Date(booking.booking_date).toLocaleDateString('ko-KR')}
        &nbsp;&nbsp;
        🕐 {booking.start_time.slice(0,5)} — {booking.end_time.slice(0,5)}
      </div>

      {showCancel && booking.status === 'confirmed' && (
        <button onClick={onCancel} style={styles.cancelBtn}>
          Cancel booking
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '700px',
    margin:   '0 auto',
    padding:  '2rem 1rem',
  },
  title: {
    fontSize:     '1.75rem',
    fontWeight:   700,
    color:        '#1a1a1a',
    marginBottom: '1.5rem',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize:     '1.1rem',
    fontWeight:   600,
    color:        '#333',
    marginBottom: '0.75rem',
  },
  card: {
    background:    '#fff',
    borderRadius:  '12px',
    padding:       '1rem 1.25rem',
    marginBottom:  '0.75rem',
    boxShadow:     '0 2px 8px rgba(0,0,0,0.06)',
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.5rem',
  },
  cardCancelled: {
    background: '#fafafa',
    boxShadow:  'none',
    border:     '1px solid #f0f0f0',
  },
  cardTop: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  amenityName: {
    fontWeight: 600,
    color:      '#1a1a1a',
  },
  textMuted: {
    color: '#aaa',
  },
  cardDetail: {
    fontSize: '0.875rem',
    color:    '#555',
  },
  statusBadge: {
    fontSize:     '0.75rem',
    padding:      '0.2rem 0.6rem',
    borderRadius: '12px',
    fontWeight:   500,
  },
  badgeConfirmed: {
    background: '#f0fdf4',
    color:      '#16a34a',
  },
  badgeCancelled: {
    background: '#f5f5f5',
    color:      '#999',
  },
  badgeCompleted: {
    background: '#eff6ff',
    color:      '#2563eb',
  },
  cancelBtn: {
    alignSelf:    'flex-start',
    padding:      '0.4rem 0.875rem',
    background:   'transparent',
    border:       '1px solid #fca5a5',
    borderRadius: '8px',
    color:        '#dc2626',
    fontSize:     '0.8rem',
  },
  toggleBtn: {
    background:   'transparent',
    border:       'none',
    color:        '#2563eb',
    fontSize:     '0.875rem',
    padding:      '0.5rem 0',
    marginBottom: '0.5rem',
    textDecoration: 'underline',
  },
  empty: {
    color:   '#999',
    padding: '1rem 0',
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
    padding:        '4rem',
    textAlign:      'center',
    color:          '#666',
  },
};