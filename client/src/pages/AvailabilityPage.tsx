import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { getAmenity, getAvailability, getClosures } from '../api/amenities';
import { createBooking } from '../api/bookings';
import type { Amenity, TimeSlot, ClosureInfo } from '../api/amenities';
import 'react-day-picker/dist/style.css';

export default function AvailabilityPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [amenity,      setAmenity]      = useState<Amenity | null>(null);
  const [slots,        setSlots]        = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [closures,     setClosures]     = useState<ClosureInfo | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [booking,      setBooking]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  // Format Date object to YYYY-MM-DD string
  function toDateStr(d: Date): string {
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  }

  // Load amenity details
  useEffect(() => {
    if (!id) return;
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

  // Load closure info which covers today + 90 days
  useEffect(() => {
    if (!id) return;
    async function loadClosures() {
      try {
        const today  = new Date();
        const future = new Date();
        future.setDate(future.getDate() + 90);
        const data = await getClosures(
          id!,
          toDateStr(today),
          toDateStr(future)
        );
        setClosures(data);
      } catch {
        // Non-critical
      }
    }
    loadClosures();
  }, [id]);

  // Load slots when a date is selected
  const loadSlots = useCallback(async (date: Date) => {
    if (!id) return;
    setLoading(true);
    setSelectedSlot(null);
    setError('');
    try {
      const data = await getAvailability(id, toDateStr(date));
      setSlots(data.slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    setSelectedDate(day);
    loadSlots(day);
  }

  async function handleBook() {
    if (!selectedSlot || !id || !selectedDate) return;
    setBooking(true);
    setError('');

    try {
      await createBooking(
        id,
        toDateStr(selectedDate),
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

  // This builds the set of disabled dates for DayPicker
  function isDateDisabled(date: Date): boolean {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    if (!closures) return false;

    // Disable closed weekdays
    if (closures.closed_weekdays.includes(date.getDay())) return true;

    // Disable holiday dates
    const dateStr = toDateStr(date);
    if (closures.holidays.some(h => h.date === dateStr)) return true;

    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateStr = selectedDate ? toDateStr(selectedDate) : null;

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/')} style={styles.back}>
        ← Back
      </button>

      <h1 style={styles.title}>{amenity?.name ?? 'Loading...'}</h1>
      {amenity?.location && (
        <p style={styles.location}>📍 {amenity.location}</p>
      )}

      {/* Calendar */}
      <div style={styles.calendarSection}>
        <p style={styles.calendarLabel}>Select a date</p>

        <div style={styles.calendarWrapper}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDaySelect}
            disabled={isDateDisabled}
            startMonth={today}
            modifiers={{
              holiday: (date) => {
                if (!closures) return false;
                return closures.holidays.some(h => h.date === toDateStr(date));
              },
              closedWeekday: (date) => {
                if (!closures) return false;
                return closures.closed_weekdays.includes(date.getDay());
              },
            }}
            modifiersStyles={{
              holiday: {
                color:           '#dc2626',
                textDecoration:  'line-through',
                backgroundColor: '#fef2f2',
              },
              closedWeekday: {
                color:           '#9ca3af',
                textDecoration:  'line-through',
                backgroundColor: '#f9fafb',
              },
            }}
            styles={{
              root: {
                fontFamily: 'inherit',
              },
            }}
          />
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#f9fafb', border: '1px solid #ddd' }} />
            Closed day
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#fef2f2', border: '1px solid #fecaca' }} />
            Holiday
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#2563eb' }} />
            Selected
          </span>
        </div>
      </div>

      {error   && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Slots */}
      {selectedDate && (
        <>
          <p style={styles.slotsLabel}>
            Available slots for {selectedDate.toLocaleDateString('ko-KR')}
          </p>

          {loading ? (
            <div style={styles.center}>Loading slots...</div>
          ) : (
            <div style={styles.slotsGrid}>
              {slots.map(slot => {
                const slotEndDateTime = new Date(`${dateStr}T${slot.end_time}:00`);
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
                    <span style={styles.slotTime}>
                      {slot.start_time.slice(0, 5)}
                    </span>
                    {slot.capacity > 1 && !isPast && (
                      <span style={styles.slotSpots}>
                        {slot.available
                          ? `${slot.spots_remaining} left`
                          : 'Full'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedSlot && (
            <div style={styles.confirmBox}>
              <p style={styles.confirmText}>
                Booking: <strong>
                  {selectedSlot.start_time.slice(0,5)} — {selectedSlot.end_time.slice(0,5)}
                </strong> on {selectedDate.toLocaleDateString('ko-KR')}
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

      {!selectedDate && !loading && (
        <div style={styles.center}>
          <p style={{ color: '#999' }}>Select a date above to see available slots</p>
        </div>
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
  calendarSection: {
    marginBottom: '1.5rem',
  },
  calendarLabel: {
    fontSize:     '0.875rem',
    fontWeight:   500,
    color:        '#333',
    marginBottom: '0.75rem',
  },
  calendarWrapper: {
    background:   '#fff',
    borderRadius: '12px',
    padding:      '1rem',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
    display:      'inline-block',
  },
  legend: {
    display:    'flex',
    gap:        '1.25rem',
    marginTop:  '0.75rem',
    flexWrap:   'wrap',
  },
  legendItem: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.4rem',
    fontSize:   '0.775rem',
    color:      '#555',
  },
  legendDot: {
    width:        '14px',
    height:       '14px',
    borderRadius: '3px',
    display:      'inline-block',
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
  slotTime: {
    display: 'block',
  },
  slotSpots: {
    display:   'block',
    fontSize:  '0.7rem',
    marginTop: '0.15rem',
    opacity:   0.8,
  },
  confirmBox: {
    background:    '#f8faff',
    border:        '1px solid #bfdbfe',
    borderRadius:  '12px',
    padding:       '1.25rem',
    display:       'flex',
    flexDirection: 'column',
    gap:           '1rem',
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
};