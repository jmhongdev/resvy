import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import {
  getAmenity,
  getAvailability,
  getClosures,
} from '../api/amenities';
import type {
  Amenity,
  ClosureInfo,
  TimeSlot,
} from '../api/amenities';
import { createBooking } from '../api/bookings';
import '../resvy/client/node_modules/react-day-picker/dist/style.css';

interface AmenityLoadResult {
  amenityId: string;
  data?: Amenity;
  error?: string;
}

interface ClosureLoadResult {
  amenityId: string;
  data?: ClosureInfo;
  error?: string;
}

interface SelectionState {
  amenityId: string;
  date?: Date;
  slot: TimeSlot | null;
}

interface AvailabilityState {
  requestKey: string;
  slots: TimeSlot[];
}

interface RequestError {
  requestKey: string;
  message: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

  // Date-only API values are built from local calendar fields instead of `toISOString()`, which converts to UTC and can shift the date near midnight.
function toDateString(date: Date): string {
  return [
     date.getFullYear(),
     String(date.getMonth() + 1).padStart(2, '0'),
     String(date.getDate()).padStart(2, '0'),
   ].join('-');
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function combineLocalDateAndTime(date: Date, time: string): Date {
  const result = new Date(date);
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function formatSelectedDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function getBookingWindowStatus(amenity: Amenity, now: Date): {
  isOpen: boolean;
  message: string;
  nextOpenMessage: string;
} {
  if (!amenity.booking_window_start || !amenity.booking_window_end) {
    return { isOpen: true, message: '', nextOpenMessage: '' };
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const windowStart = amenity.booking_window_start.slice(0, 5);
  const windowEnd = amenity.booking_window_end.slice(0, 5);
  const isOpen = currentTime >= windowStart && currentTime < windowEnd;

  if (isOpen) {
    return {
      isOpen: true,
      message: `Booking open until ${windowEnd}`,
      nextOpenMessage: '',
    };
  }

  return {
    isOpen: false,
    message: 'Booking is currently closed',
    nextOpenMessage:
      currentTime < windowStart
        ? `Opens today at ${windowStart}`
        : `Opens tomorrow at ${windowStart}`,
  };
}

export default function AvailabilityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  //Results carry the amenity ID that produced them. React Router can reuse this component when only `:id` changes. Keyed results prevent the previous amenity or closures from flashing under the new URL while its request is pending.
  const [amenityResult, setAmenityResult] = useState<AmenityLoadResult | null>(null);
  const [closureResult, setClosureResult] = useState<ClosureLoadResult | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    amenityId: id ?? '',
    date: undefined,
    slot: null,
  });
  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [loadingRequestKey, setLoadingRequestKey] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<RequestError | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [booking, setBooking] = useState(false);

  // `now` refreshes while the page remains open. The original booking-window banner and button could remain stale forever after crossing an opening/closing boundary.
  const [now, setNow] = useState(() => new Date());

  const availabilityRequestIdRef = useRef(0);
  const bookingInFlightRef = useRef(false);
  const idempotencyKeyRef = useRef('');
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const amenity =
    amenityResult && amenityResult.amenityId === id
      ? amenityResult.data ?? null
      : null;
  const amenityError =
    amenityResult && amenityResult.amenityId === id
      ? amenityResult.error ?? ''
      : '';
  const amenityLoading = Boolean(id) && amenityResult?.amenityId !== id;

  const closures =
    closureResult && closureResult.amenityId === id
      ? closureResult.data ?? null
      : null;
  const closureError =
    closureResult && closureResult.amenityId === id
      ? closureResult.error ?? ''
      : '';
  const closuresLoading = Boolean(id) && closureResult?.amenityId !== id;

  const selectedDate = selection.amenityId === id ? selection.date : undefined;
  const selectedSlot = selection.amenityId === id ? selection.slot : null;
  const selectedDateString = selectedDate ? toDateString(selectedDate) : '';
  const currentRequestKey = id && selectedDateString ? `${id}:${selectedDateString}` : '';
  const slots =
    availability?.requestKey === currentRequestKey ? availability.slots : [];
  const slotsLoading = loadingRequestKey === currentRequestKey;
  const slotsError =
    availabilityError?.requestKey === currentRequestKey
      ? availabilityError.message
      : '';

  const today = startOfDay(now);
  const maximumDate = useMemo(
    () => (amenity ? addDays(startOfDay(new Date()), amenity.max_advance_days) : null),
    [amenity]
  );

  const holidayDates = useMemo(
    () => new Set(closures?.holidays.map(holiday => holiday.date) ?? []),
    [closures]
  );

  const bookingWindowStatus = amenity
    ? getBookingWindowStatus(amenity, now)
    : null;
  // Amenity and closure requests are independently guarded. A closure failure no longer silently enables dates that may be closed. The calendar fails closed and displays its own error while amenity details remain visible.

  useEffect(() => {
    if (!id) return;

    let active = true;
    const amenityId = id;

    async function loadAmenityDetails() {
      try {
        const data = await getAmenity(amenityId);
        if (active) setAmenityResult({ amenityId, data });
      } catch (error) {
        if (active) {
          setAmenityResult({
            amenityId,
            error: getErrorMessage(error, 'Failed to load amenity'),
          });
        }
      }
    }

    async function loadClosureCalendar() {
      const from = startOfDay(new Date());
      const to = addDays(from, 90);

      try {
        const data = await getClosures(
          amenityId,
          toDateString(from),
          toDateString(to)
        );
        if (active) setClosureResult({ amenityId, data });
      } catch (error) {
        if (active) {
          setClosureResult({
            amenityId,
            error: getErrorMessage(error, 'Failed to load closure calendar'),
          });
        }
      }
    }

    void loadAmenityDetails();
    void loadClosureCalendar();

    return () => {
      active = false;
    };
  }, [id]);
  
  //timer is an external subscription, so updating state from its callback is an appropriate effect. Cleanup prevents updates after unmount.

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    };
  }, []);

  async function loadSlots(amenityId: string, date: Date) {
    const dateString = toDateString(date);
    const requestKey = `${amenityId}:${dateString}`;
    const requestId = ++availabilityRequestIdRef.current;

    setLoadingRequestKey(requestKey);
    setAvailabilityError(null);
    setBookingError('');
    setBookingSuccess('');

    try {
      const data = await getAvailability(amenityId, dateString);
      if (requestId !== availabilityRequestIdRef.current) return;

      setAvailability({ requestKey, slots: data.slots });
    } catch (error) {
      if (requestId === availabilityRequestIdRef.current) {
        setAvailability({ requestKey, slots: [] });
        setAvailabilityError({
          requestKey,
          message: getErrorMessage(error, 'Failed to load availability'),
        });
      }
    } finally {
      if (requestId === availabilityRequestIdRef.current) {
        setLoadingRequestKey(null);
      }
    }
  }

  //

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
        selectedSlot.end_time,
        undefined,
        idempotencyKey.current
      );
      setSuccess('Booking confirmed!');
      setTimeout(() => navigate('/my-bookings'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  function getBookingWindowStatus(amenity: Amenity): {
  isOpen:      boolean;
  message:     string;
  nextOpenMsg: string;
  } {
    if (!amenity.booking_window_start || !amenity.booking_window_end) {
      return { isOpen: true, message: '', nextOpenMsg: '' };
    }

    const now       = new Date();
    const nowTime   = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const winStart  = amenity.booking_window_start.slice(0, 5);
    const winEnd    = amenity.booking_window_end.slice(0, 5);

    const isOpen = nowTime >= winStart && nowTime < winEnd;

    if (isOpen) {
      return {
        isOpen:      true,
        message:     `Booking open until ${winEnd}`,
        nextOpenMsg: '',
      };
    }

    // Before opening time today
    if (nowTime < winStart) {
      return {
        isOpen:      false,
        message:     'Booking is currently closed',
        nextOpenMsg: `Opens today at ${winStart}`,
      };
    }

    // After closing time — opens tomorrow
    return {
      isOpen:      false,
      message:     'Booking is currently closed',
      nextOpenMsg: `Opens tomorrow at ${winStart}`,
    };
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

      {amenity && amenity.booking_window_start && (
        (() => {
          const status = getBookingWindowStatus(amenity);
          return (
            <div style={{
              ...styles.windowBanner,
              ...(status.isOpen ? styles.windowBannerOpen : styles.windowBannerClosed),
            }}>
              <span style={styles.windowIcon}>
                {status.isOpen ? '🟢' : '🔴'}
              </span>
              <div>
                <p style={styles.windowMessage}>{status.message}</p>
                {status.nextOpenMsg && (
                  <p style={styles.windowNext}>{status.nextOpenMsg}</p>
                )}
              </div>
            </div>
          );
        })()
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
                    onClick={() => {
                      if (!isUnavailable) {
                        setSelectedSlot(slot);
                        idempotencyKey.current = crypto.randomUUID();
                      }
                    }}
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
                style={(booking || (amenity && !getBookingWindowStatus(amenity).isOpen))
                  ? styles.buttonDisabled
                  : styles.button}
                disabled={booking || (amenity ? !getBookingWindowStatus(amenity).isOpen : false)}
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

const styles: Record<string, CSSProperties> = {
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
  windowBanner: {
    display:      'flex',
    alignItems:   'flex-start',
    gap:          '0.75rem',
    padding:      '0.875rem 1rem',
    borderRadius: '10px',
    marginBottom: '1.25rem',
    border:       '1px solid',
  },
  windowBannerOpen: {
    background:   '#f0fdf4',
    borderColor:  '#bbf7d0',
  },
  windowBannerClosed: {
    background:   '#fef2f2',
    borderColor:  '#fecaca',
  },
  windowIcon: {
    fontSize:   '1rem',
    flexShrink: 0,
    marginTop:  '0.1rem',
  },
  windowMessage: {
    fontWeight: 600,
    fontSize:   '0.875rem',
    color:      '#1a1a1a',
  },
  windowNext: {
    fontSize:  '0.8rem',
    color:     '#666',
    marginTop: '0.2rem',
  },
};