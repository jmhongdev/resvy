import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAmenity, getAvailability } from '../api/amenities';
import { createBooking } from '../api/bookings';
import type { Amenity, TimeSlot } from '../api/amenities';

export default function AvailabilityPage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();

  const [amenity,      setAmenity]      = useState<Amenity | null>(null);
  const [slots,        setSlots]        = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [date,         setDate]         = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0];
  });
  const [loading,      setLoading]      = useState(true);
  const [booking,      setBooking]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  // Load amenity details on mount
  useEffect(() => {
    async function loadAmenity() {
      try {
        const data = await getAmenity(id!);
        setAmenity(data);
      } catch {
        setError('Failed to load amenity');
      }
    }
    loadAmenity();
  }, [id]);

  // Load availability whenever date changes
  useEffect(() => {
    if (!id || !date) return;

    async function loadSlots() {
      setLoading(true);
      setSelectedSlot(null);
      setError('');
      try {
        const data = await getAvailability(id!, date);
        setSlots(data.slots);
      } catch {
        setError('Failed to load availability');
      } finally {
        setLoading(false);
      }
    }
    loadSlots();
  }, [id, date]);

  async function handleBook() {
    if (!selectedSlot || !id) return;
    setBooking(true);
    setError('');

    try {
      await createBooking(
        id,
        date,
        selectedSlot.start_time,
        selectedSlot.end_time
      );
      setSuccess('Booking confirmed!');
      setTimeout(() => navigate('/my-bookings'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/')} style={styles.back}>
        ← Back
      </button>

      <h1 style={styles.title}>{amenity?.name ?? 'Loading...'}</h1>
      {amenity?.location && (
        <p style={styles.location}>📍 {amenity.location}</p>
      )}

      <div style={styles.datePicker}>
        <label style={styles.label}>Select date</label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => setDate(e.target.value)}
          style={styles.dateInput}
        />
      </div>

      {error   && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {loading ? (
        <div style={styles.center}>Loading slots...</div>
      ) : (
        <>
          <p style={styles.slotsLabel}>
            Available slots for {date}
          </p>
          <div style={styles.slotsGrid}>
            {slots.map(slot => {
              // Check if this slot has already passed for today's date
              const slotEndDateTime = new Date(`${date}T${slot.end_time}:00`);
              const isPast          = slotEndDateTime < new Date();
              const isUnavailable   = !slot.available || isPast;

              return (
                <button
                  key={slot.start_time}
                  onClick={() => !isUnavailable && setSelectedSlot(slot)}
                  style={{
                    ...styles.slot,
                    ...(isUnavailable ? styles.slotTaken : {}),
                    ...(selectedSlot?.start_time === slot.start_time
                      ? styles.slotSelected
                      : {}),
                  }}
                  disabled={isUnavailable}
                  title={isPast ? 'This slot has already passed' : ''}
                >
                  <span style={styles.slotTime}>{slot.start_time.slice(0, 5)}</span>
                  {slot.capacity > 1 && !isPast && (
                    <span style={styles.slotSpots}>
                      {slot.available ? `${slot.spots_remaining} left` : 'Full'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedSlot && (
            <div style={styles.confirmBox}>
              <p style={styles.confirmText}>
                Booking: <strong>{selectedSlot.start_time.slice(0,5)} — {selectedSlot.end_time.slice(0,5)}</strong> on {date}
              </p>
              <button
                onClick={handleBook}
                style={booking ? styles.buttonDisabled : styles.button}
                disabled={booking}
              >
                {booking ? 'Confirming...' : 'Confirm booking'}
              </button>
            </div>
          )}
        </>
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
  back: {
    background:   'transparent',
    border:       'none',
    color:        '#2563eb',
    fontSize:     '0.9rem',
    marginBottom: '1rem',
    padding:      0,
  },
  title: {
    fontSize:   '1.75rem',
    fontWeight: 700,
    color:      '#1a1a1a',
  },
  location: {
    color:        '#666',
    marginTop:    '0.25rem',
    marginBottom: '1.5rem',
  },
  datePicker: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.25rem',
    marginBottom:  '1.5rem',
  },
  label: {
    fontSize:   '0.875rem',
    fontWeight: 500,
    color:      '#333',
  },
  dateInput: {
    padding:      '0.5rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '1rem',
    maxWidth:     '200px',
  },
  slotsLabel: {
    fontSize:     '0.9rem',
    color:        '#555',
    marginBottom: '0.75rem',
  },
  slotsGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap:                 '0.5rem',
    marginBottom:        '1.5rem',
  },
  slot: {
    padding:      '0.625rem',
    background:   '#eff6ff',
    color:        '#2563eb',
    border:       '1px solid #bfdbfe',
    borderRadius: '8px',
    fontSize:     '0.875rem',
    fontWeight:   500,
  },
  slotTaken: {
    background: '#f5f5f5',
    color:      '#aaa',
    border:     '1px solid #eee',
  },
  slotSelected: {
    background: '#2563eb',
    color:      '#fff',
    border:     '1px solid #2563eb',
  },
  confirmBox: {
    background:   '#f8faff',
    border:       '1px solid #bfdbfe',
    borderRadius: '12px',
    padding:      '1.25rem',
    display:      'flex',
    flexDirection: 'column',
    gap:          '1rem',
  },
  confirmText: {
    fontSize: '0.95rem',
    color:    '#333',
  },
  button: {
    padding:      '0.75rem',
    background:   '#2563eb',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '1rem',
    fontWeight:   500,
  },
  buttonDisabled: {
    padding:      '0.75rem',
    background:   '#93c5fd',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '1rem',
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
  success: {
    background:   '#f0fdf4',
    border:       '1px solid #bbf7d0',
    borderRadius: '8px',
    padding:      '0.75rem',
    color:        '#16a34a',
    fontSize:     '0.875rem',
    marginBottom: '1rem',
  },
  center: {
    padding:   '2rem',
    textAlign: 'center',
    color:     '#666',
  },
  slotTime: {
    display: 'block',
  },
  slotSpots: {
    display:   'block',
    fontSize:  '0.7rem',
    marginTop: '0.15rem',
    opacity:   0.8,
  },
};