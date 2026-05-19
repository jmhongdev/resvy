import { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../api/bookings';
import type { Booking } from '../api/bookings';

export default function MyBookingsPage() {
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past,     setPast]     = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyBookings();
        setUpcoming(data.upcoming);
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
      // Reload after cancel
      const data = await getMyBookings();
      setUpcoming(data.upcoming);
      setPast(data.past);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    }
  }

  if (loading) return <div style={styles.center}>Loading bookings...</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>My Bookings</h1>

      {error && <div style={styles.error}>{error}</div>}

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

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Past</h2>
        {past.length === 0 ? (
          <p style={styles.empty}>No past bookings.</p>
        ) : (
          past.map(booking => (
            <BookingCard key={booking.id} booking={booking} />
          ))
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
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div>
          <p style={styles.amenityName}>{booking.amenity_name}</p>
          <p style={styles.cardDetail}>📍 {booking.amenity_location}</p>
        </div>
        <span style={{
          ...styles.statusBadge,
          ...(booking.status === 'cancelled' ? styles.badgeCancelled : styles.badgeConfirmed),
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
  cardTop: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  amenityName: {
    fontWeight: 600,
    color:      '#1a1a1a',
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
    background: '#fef2f2',
    color:      '#dc2626',
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
    padding:   '4rem',
    textAlign: 'center',
    color:     '#666',
  },
};