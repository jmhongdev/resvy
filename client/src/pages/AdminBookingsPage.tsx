import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { getAdminBookings, cancelBooking } from '../api/bookings';
import { getAmenities } from '../api/amenities';
import type { AdminBooking, AdminBookingFilters } from '../api/bookings';
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
  const [date,      setDate]      = useState('');
  const [status,    setStatus]    = useState('');

  //Track filters that produced the currently displayed bookings, separately from the editable controls. 
  const appliedFiltersRef = useRef<AdminBookingFilters>({});

  const loadBookings = useCallback(async (filters: AdminBookingFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminBookings(filters);
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [amenityData] = await Promise.all([
          getAmenities(),
          loadBookings(),
        ]);
        setAmenities(amenityData);
      } catch {
        setError('Failed to load data');
      }
    }
    init();
  }, [loadBookings]);

  function handleFilter() {
    const filters: AdminBookingFilters = {};
    if (amenityId) filters.amenity_id = amenityId;
    if (date)      filters.date       = date;
    if (status)    filters.status     = status;
    loadBookings(filters);
  }

  function handleReset() {
    setAmenityId('');
    setDate('');
    setStatus('');
    loadBookings();
  }

  async function handleCancel(id: string, residentName: string) {
    if (!confirm(`Cancel booking for ${residentName}?`)) return;
    try {
      await cancelBooking(id);
      handleFilter();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    }
  }

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Booking Management</h1>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Total shown</p>
          <p style={styles.summaryValue}>{bookings.length}</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Confirmed</p>
          <p style={{ ...styles.summaryValue, color: '#16a34a' }}>{confirmedCount}</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Cancelled</p>
          <p style={{ ...styles.summaryValue, color: '#dc2626' }}>{cancelledCount}</p>
        </div>
      </div>

      <div style={styles.filterBar}>
        <select
          value={amenityId}
          onChange={e => setAmenityId(e.target.value)}
          style={styles.select}
        >
          <option value="">All amenities</option>
          {amenities.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={styles.dateInput}
        />

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>

        <button onClick={handleFilter} style={styles.filterBtn}>
          Filter
        </button>
        <button onClick={handleReset} style={styles.resetBtn}>
          Reset
        </button>
      </div>

      {loading ? (
        <div style={styles.center}>Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div style={styles.center}>No bookings found.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Resident</th>
                <th style={styles.th}>Amenity</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.id} style={styles.tr}>
                  <td style={styles.td}>
                    <p style={styles.residentName}>{booking.resident_name}</p>
                    <p style={styles.residentEmail}>{booking.resident_email}</p>
                  </td>
                  <td style={styles.td}>
                    <p>{booking.amenity_name}</p>
                    <p style={styles.residentEmail}>{booking.amenity_location}</p>
                  </td>
                  <td style={styles.td}>
                    {new Date(booking.booking_date).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={styles.td}>
                    {booking.start_time.slice(0,5)} — {booking.end_time.slice(0,5)}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(booking.status === 'confirmed' ? styles.badgeConfirmed : {}),
                      ...(booking.status === 'cancelled' ? styles.badgeCancelled : {}),
                      ...(booking.status === 'completed' ? styles.badgeCompleted : {}),
                    }}>
                      {booking.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(booking.id, booking.resident_name)}
                        style={styles.cancelBtn}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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