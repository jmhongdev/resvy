import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { cancelBooking, getAdminBookings } from '../api/bookings';
import type {
  AdminBooking,
  AdminBookingFilters,
} from '../api/bookings';
import { getAmenities } from '../api/amenities';
import type { Amenity } from '../api/amenities';

type StatusFilter = '' | AdminBooking['status'];

//Using one error conversion rule everywhere so that useful API
//messages are preserved while non-Error throws still receive a safe fallback.
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

//Construct API payload in one place. Empty strings used because controlled form elements need string values. The API receives only filters that the admin actually selected.
function buildFilters(
  amenityId: string,
  date: string,
  status: StatusFilter
): AdminBookingFilters {
  return {
    ...(amenityId ? { amenity_id: amenityId } : {}),
    ...(date ? { date } : {}),
    ...(status ? { status } : {}),
  };
}

//API returns 'YYYY-MM-DD'. Parsing that string with new Date(value) treats it as UTC and can display the previous date in negative UTC. So created an explicit UTC date and formatting in UTC keeps the date-only value stable.
function formatBookingDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatStatus(status: AdminBooking['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}



export default function AdminBookingsPage() {
  const [bookings,  setBookings]  = useState<AdminBooking[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  //Amenities and bookings are independent requests. Separate state means a failed dropdown request does not erase a useful booking error or prevent booking results from rendering.
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [amenitiesError, setAmenitiesError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Filter state
  const [amenityId, setAmenityId] = useState('');
  const [date, setDate]      = useState('');
  const [status, setStatus] = useState<StatusFilter>('');

  //Track filters that produced the currently displayed bookings, separately from the editable controls. 
  const appliedFiltersRef = useRef<AdminBookingFilters>({});

  //Only the newest request may update shared state
  const bookingRequestIdRef = useRef(0);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  //All state changes occur after their external request settles, avoiding synchronous derived-state effects and allowing partial success.
  useEffect(() => {
    let active = true;
    const bookingRequestId = ++bookingRequestIdRef.current;

    async function loadInitialAmenities() {
      try {
        const data = await getAmenities();
        if (active) setAmenities(data);
      } catch (error) {
        if (active) {
          setAmenitiesError(getErrorMessage(error, 'Failed to load amenities'));
        }
      } finally {
        if (active) setLoadingAmenities(false);
      }
    }

    async function loadInitialBookings() {
      try {
        const data = await getAdminBookings();
        if (active && bookingRequestId === bookingRequestIdRef.current) {
          setBookings(data);
          appliedFiltersRef.current = {};
        }
      } catch (error) {
        if (active && bookingRequestId === bookingRequestIdRef.current) {
          setBookingsError(getErrorMessage(error, 'Failed to load bookings'));
        }
      } finally {
        if (active && bookingRequestId === bookingRequestIdRef.current) {
          setLoadingBookings(false);
        }
      }
    }

    void loadInitialAmenities();
    void loadInitialBookings();

    return () => {
      active = false;
    };
  }, []);

  //Clean up the successs message timer on unmount. Replacing the timer before each message also prevents an earlier cancellation from clearing a newer one.
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  async function loadBookings(filters: AdminBookingFilters) {
    const requestId = ++bookingRequestIdRef.current;
    setLoadingBookings(true);
    setBookingsError('');
    setCancelError('');
    setSuccessMessage('');

    //Clear old rows while loading. 
    setBookings([]);

    try {
      const data = await getAdminBookings(filters);
      if (requestId !== bookingRequestIdRef.current) return;

      setBookings(data);
      appliedFiltersRef.current = filters;
    } catch (error) {
      if (requestId === bookingRequestIdRef.current) {
        setBookingsError(getErrorMessage(error, 'Failed to load bookings'));
      }
    } finally {
      if (requestId === bookingRequestIdRef.current) {
        setLoadingBookings(false);
      }
    }
  }

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadBookings(buildFilters(amenityId, date, status));
  }

  function handleReset() {
    setAmenityId('');
    setDate('');
    setStatus('');
    void loadBookings({});
  }

  async function handleCancel(booking: AdminBooking) {
    if (
      !window.confirm(
        `Cancel ${booking.amenity_name} booking for ${booking.resident_name} on ${booking.booking_date}?`
      )
    ) {
      return;
    }

    const bookingId = booking.id;
    setCancellingId(bookingId);
    setCancelError('');
    setSuccessMessage('');

    try {
      await cancelBooking(bookingId);

      //Do not refetch after a successful cancellation.
      setBookings(previous => {
        if (appliedFiltersRef.current.status === 'confirmed') {
          return previous.filter(item => item.id !== bookingId);
        }

        return previous.map(item =>
          item.id === bookingId ? { ...item, status: 'cancelled' } : item
        );
      });

      setSuccessMessage(`Booking for ${booking.resident_name} was cancelled.`);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setCancelError(getErrorMessage(error, 'Failed to cancel booking'));
    } finally {
      setCancellingId(null);
    }
  }

  const confirmedCount = bookings.filter(
    booking => booking.status === 'confirmed'
  ).length;
  const cancelledCount = bookings.filter(
    booking => booking.status === 'cancelled'
  ).length;
  const controlsDisabled = loadingBookings || cancellingId !== null;

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Booking Management</h1>

      {amenitiesError && (
        <div style={styles.warning} role="alert">
          Amenity filter unavailable: {amenitiesError}
        </div>
      )}
      {bookingsError && (
        <div style={styles.error} role="alert">{bookingsError}</div>
      )}
      {cancelError && (
        <div style={styles.error} role="alert">{cancelError}</div>
      )}
      {successMessage && (
        <div style={styles.success} role="status" aria-live="polite">
          {successMessage}
        </div>
      )}

      <section style={styles.summaryGrid} aria-label="Displayed booking summary">
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Total shown</p>
          <p style={styles.summaryValue}>{loadingBookings ? '...' : bookings.length}</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Confirmed</p>
          <p style={{ ...styles.summaryValue, color: '#15803d' }}>
            {loadingBookings ? '...' : confirmedCount}
          </p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Cancelled</p>
          <p style={{ ...styles.summaryValue, color: '#b91c1c' }}>
            {loadingBookings ? '...' : cancelledCount}
          </p>
        </div>
      </section>

      <form onSubmit={handleFilter} style={styles.filterBar} aria-label="Booking filters">
        <div style={styles.filterField}>
          <label htmlFor="booking-amenity-filter" style={styles.label}>Amenity</label>
          <select
            id="booking-amenity-filter"
            value={amenityId}
            onChange={event => setAmenityId(event.target.value)}
            style={styles.select}
            disabled={loadingAmenities || controlsDisabled}
          >
            <option value="">All amenities</option>
            {amenities.map(amenity => (
              <option key={amenity.id} value={amenity.id}>{amenity.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterField}>
          <label htmlFor="booking-date-filter" style={styles.label}>Date</label>
          <input
            id="booking-date-filter"
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
            style={styles.dateInput}
            disabled={controlsDisabled}
          />
        </div>

        <div style={styles.filterField}>
          <label htmlFor="booking-status-filter" style={styles.label}>Status</label>
          <select
            id="booking-status-filter"
            value={status}
            onChange={event => setStatus(event.target.value as StatusFilter)}
            style={styles.select}
            disabled={controlsDisabled}
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <button type="submit" style={styles.filterBtn} disabled={controlsDisabled}>
          Filter
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={styles.resetBtn}
          disabled={controlsDisabled}
        >
          Reset
        </button>
      </form>

      {loadingBookings ? (
        <div style={styles.center} role="status" aria-live="polite">
          Loading bookings...
        </div>
      ) : bookingsError ? null : bookings.length === 0 ? (
        <div style={styles.center}>No bookings found.</div>
      ) : (
        // Horizontal scrolling keeps every column reachable on small screens. `overflow: hidden` in the original clipped wide table content.
        <div style={styles.tableWrapper} tabIndex={0} aria-label="Scrollable booking table">
          <table style={styles.table}>
            <caption style={styles.caption}>Bookings matching the applied filters</caption>
            <thead>
              <tr>
                <th scope="col" style={styles.th}>Resident</th>
                <th scope="col" style={styles.th}>Amenity</th>
                <th scope="col" style={styles.th}>Date</th>
                <th scope="col" style={styles.th}>Time</th>
                <th scope="col" style={styles.th}>Status</th>
                <th scope="col" style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => {
                const cancelling = cancellingId === booking.id;
                return (
                  <tr key={booking.id} style={styles.tr}>
                    <td style={styles.td}>
                      <p style={styles.residentName}>{booking.resident_name}</p>
                      <p style={styles.secondaryText}>{booking.resident_email}</p>
                    </td>
                    <td style={styles.td}>
                      <p>{booking.amenity_name}</p>
                      {booking.amenity_location && (
                        <p style={styles.secondaryText}>{booking.amenity_location}</p>
                      )}
                    </td>
                    <td style={styles.td}>{formatBookingDate(booking.booking_date)}</td>
                    <td style={styles.td}>
                      {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(booking.status === 'confirmed' ? styles.badgeConfirmed : {}),
                          ...(booking.status === 'cancelled' ? styles.badgeCancelled : {}),
                          ...(booking.status === 'completed' ? styles.badgeCompleted : {}),
                        }}
                      >
                        {formatStatus(booking.status)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {booking.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => void handleCancel(booking)}
                          style={styles.cancelBtn}
                          disabled={cancellingId !== null || loadingBookings}
                          aria-label={`Cancel ${booking.amenity_name} booking for ${booking.resident_name} on ${booking.booking_date}`}
                        >
                          {cancelling ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: '1000px',
    margin:   '0 auto',
    padding:  '2rem 1rem',
  },
  title: {
    fontSize:     '1.75rem',
    fontWeight:   700,
    color:        '#1a1a1a',
    marginBottom: '1.5rem',
  },
  summaryGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap:                 '1rem',
    marginBottom:        '1.5rem',
  },
  summaryCard: {
    background:   '#fff',
    borderRadius: '12px',
    padding:      '1rem 1.25rem',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
  },
  summaryLabel: {
    fontSize:     '0.8rem',
    color:        '#666',
    marginBottom: '0.4rem',
  },
  summaryValue: {
    fontSize:   '1.75rem',
    fontWeight: 700,
    color:      '#1a1a1a',
  },
  filterBar: {
    display:      'flex',
    alignItems:   'center',
    gap:          '0.75rem',
    marginBottom: '1.5rem',
    flexWrap:     'wrap',
  },
  select: {
    padding:      '0.5rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.9rem',
    background:   '#fff',
  },
  dateInput: {
    padding:      '0.5rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.9rem',
  },
  filterBtn: {
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
  tableWrapper: {
    background:   '#fff',
    borderRadius: '12px',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
    overflow:     'hidden',
  },
  table: {
    width:          '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding:      '0.875rem 1rem',
    background:   '#f8faff',
    fontSize:     '0.8rem',
    fontWeight:   600,
    color:        '#555',
    textAlign:    'left',
    borderBottom: '1px solid #eee',
  },
  tr: {
    borderBottom: '1px solid #f5f5f5',
  },
  td: {
    padding:  '0.875rem 1rem',
    fontSize: '0.875rem',
    color:    '#333',
  },
  residentName: {
    fontWeight: 500,
    color:      '#1a1a1a',
  },
  residentEmail: {
    fontSize:  '0.775rem',
    color:     '#888',
    marginTop: '0.15rem',
  },
  badge: {
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
    padding:      '0.35rem 0.75rem',
    background:   'transparent',
    border:       '1px solid #fca5a5',
    borderRadius: '6px',
    color:        '#dc2626',
    fontSize:     '0.8rem',
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