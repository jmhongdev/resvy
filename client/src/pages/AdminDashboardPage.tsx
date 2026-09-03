import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getAmenityStats,
  getOverview,
  getPeakHours,
} from '../api/stats';
import type {
  AmenityStat,
  OverviewStats,
  PeakHour,
} from '../api/stats';

//Keeping the backend query optional
type AmenityStatWithOptionalId = AmenityStat & { id?: string };

//Preserve useful API error messagse consistently. A fallback covers unusual non-Error throws without hiding normal timeout, network, or server messages.
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

//These functions prevent accidental string behavior and avoids rendering "NaN" for malformed data
function toFiniteNumber(value: unknown): number | null {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : null;
}

function formatCount(value: unknown): string {
  const converted = toFiniteNumber(value);
  return converted === null ? 'Unavailable' : converted.toLocaleString('en-US');
}

function formatPercentage(value: unknown): string {
  const converted = toFiniteNumber(value);
  if (converted === null) return 'Unavailable';

  return `${converted.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [amenities, setAmenities] = useState<AmenityStatWithOptionalId[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  //Each dashboard resource gets its own loading and error state. These sepearate states allow successful sections to render as soon as they load
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [amenitiesLoading, setAmenitiesLoading] = useState(true);
  const [peakHoursLoading, setPeakHoursLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [amenitiesError, setAmenitiesError] = useState('');
  const [peakHoursError, setPeakHoursError] = useState('');

  //Each state update happens after an external request resolves or rejects. Now avoids synchronous setState-in-effect warnings.
  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const data = await getOverview();
        if (active) setOverview(data);
      } catch (error) {
        if (active) {
          setOverviewError(getErrorMessage(error, 'Failed to load overview statistics'));
        }
      } finally {
        if (active) setOverviewLoading(false);
      }
    }

    async function loadAmenities() {
      try {
        const data = await getAmenityStats();
        if (active) setAmenities(data);
      } catch (error) {
        if (active) {
          setAmenitiesError(getErrorMessage(error, 'Failed to load amenity statistics'));
        }
      } finally {
        if (active) setAmenitiesLoading(false);
      }
    }

    async function loadPeakHours() {
      try {
        const data = await getPeakHours();
        if (active) setPeakHours(data);
      } catch (error) {
        if (active) {
          setPeakHoursError(getErrorMessage(error, 'Failed to load peak-hour statistics'));
        }
      } finally {
        if (active) setPeakHoursLoading(false);
      }
    }

    void loadOverview();
    void loadAmenities();
    void loadPeakHours();

    return () => {
      active = false;
    };
  }, []);

  //Used the main landmark and labelled sections
  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Admin Dashboard</h1>

      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" style={styles.visuallyHidden}>Booking overview</h2>

        {overviewError && (
          <div style={styles.error} role="alert">{overviewError}</div>
        )}

        {/* A definition list expresses label/value statistics more
            accurately than unrelated paragraphs.*/}
        <dl style={styles.statsGrid} aria-busy={overviewLoading}>
          <StatCard
            label="Bookings this month"
            value={
              overviewLoading
                ? 'Loading...'
                : overview
                  ? formatCount(overview.total_bookings_this_month)
                  : 'Unavailable'
            }
          />
          <StatCard
            label="Most booked amenity"
            value={
              overviewLoading
                ? 'Loading...'
                : overview
                  ? overview.most_booked_amenity?.name ?? 'No bookings yet'
                  : 'Unavailable'
            }
          />
          <StatCard
            label="Busiest day"
            value={
              overviewLoading
                ? 'Loading...'
                : overview
                  ? overview.busiest_day?.day_name.trim() || 'No bookings yet'
                  : 'Unavailable'
            }
          />
          <StatCard
            label="Cancellation rate"
            value={
              overviewLoading
                ? 'Loading...'
                : overview
                  ? formatPercentage(overview.cancellation_rate_percent)
                  : 'Unavailable'
            }
          />
        </dl>
      </section>

      <section style={styles.section} aria-labelledby="amenity-utilization-heading">
        <h2 id="amenity-utilization-heading" style={styles.sectionTitle}>
          Amenity utilization (last 30 days)
        </h2>

        {amenitiesLoading ? (
          <p style={styles.status} role="status" aria-live="polite">
            Loading amenity utilization...
          </p>
        ) : amenitiesError ? (
          <div style={styles.error} role="alert">{amenitiesError}</div>
        ) : amenities.length === 0 ? (
          // The original amenity table silently displayed only its header when empty. This makes a valid empty result distinguishable from missing UI.
          <p style={styles.empty}>No amenity utilization data yet.</p>
        ) : (
          // A semantic table exposes row/column relationships that a grid of generic divs cannot. Horizontal scrolling keeps all columns reachable on narrow screens instead of clipping them.
          <div
            style={styles.tableWrapper}
            tabIndex={0}
            aria-label="Scrollable amenity utilization table"
          >
            <table style={styles.table}>
              <caption style={styles.caption}>
                Confirmed bookings and utilization during the last 30 days
              </caption>
              <thead>
                <tr>
                  <th scope="col" style={styles.th}>Amenity</th>
                  <th scope="col" style={styles.thNumeric}>Bookings</th>
                  <th scope="col" style={styles.thNumeric}>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {amenities.map((amenity, index) => (
                  <tr key={amenity.id ?? `${amenity.name}-${index}`} style={styles.tr}>
                    <th scope="row" style={styles.rowHeader}>{amenity.name}</th>
                    <td style={styles.tdNumeric}>
                      {formatCount(amenity.confirmed_bookings)}
                    </td>
                    <td style={{ ...styles.tdNumeric, ...styles.utilRate }}>
                      {formatPercentage(amenity.utilization_rate_percent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.section} aria-labelledby="peak-hours-heading">
        <h2 id="peak-hours-heading" style={styles.sectionTitle}>Peak hours</h2>

        {peakHoursLoading ? (
          <p style={styles.status} role="status" aria-live="polite">
            Loading peak hours...
          </p>
        ) : peakHoursError ? (
          <div style={styles.error} role="alert">{peakHoursError}</div>
        ) : peakHours.length === 0 ? (
          <p style={styles.empty}>No peak-hour data yet.</p>
        ) : (
          // A list communicates that these are repeated peer values. The numeric formatter also handles PostgreSQL count strings defensively.
          <ul style={styles.peakGrid} aria-label="Bookings by start time">
            {peakHours.map(peakHour => (
              <li key={peakHour.hour} style={styles.peakCard}>
                <p style={styles.peakHour}>{peakHour.hour_label}</p>
                <p style={styles.peakCount}>
                  {formatCount(peakHour.booking_count)} bookings
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <dt style={styles.statLabel}>{label}</dt>
      <dd style={styles.statValue}>{value}</dd>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: '900px',
    margin:   '0 auto',
    padding:  '2rem 1rem',
  },
  title: {
    fontSize:     '1.75rem',
    fontWeight:   700,
    color:        '#1a1a1a',
    marginBottom: '1.5rem',
  },
  statsGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap:                 '1rem',
    marginBottom:        '2rem',
  },
  statCard: {
    background:   '#fff',
    borderRadius: '12px',
    padding:      '1.25rem',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
  },
  statLabel: {
    fontSize:     '0.8rem',
    color:        '#666',
    marginBottom: '0.5rem',
  },
  statValue: {
    fontSize:   '1.5rem',
    fontWeight: 700,
    color:      '#1a1a1a',
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
  table: {
    background:   '#fff',
    borderRadius: '12px',
    overflow:     'hidden',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
  },
  tableHeader: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    padding:             '0.75rem 1.25rem',
    background:          '#f8faff',
    fontSize:            '0.8rem',
    fontWeight:          600,
    color:               '#555',
    borderBottom:        '1px solid #eee',
  },
  tableRow: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    padding:             '0.875rem 1.25rem',
    borderBottom:        '1px solid #f5f5f5',
    fontSize:            '0.9rem',
    color:               '#333',
  },
  utilRate: {
    color:      '#2563eb',
    fontWeight: 500,
  },
  peakGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap:                 '0.75rem',
  },
  peakCard: {
    background:   '#fff',
    borderRadius: '10px',
    padding:      '0.875rem',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
    textAlign:    'center',
  },
  peakHour: {
    fontSize:   '0.875rem',
    fontWeight: 600,
    color:      '#1a1a1a',
  },
  peakCount: {
    fontSize:  '0.75rem',
    color:     '#666',
    marginTop: '0.25rem',
  },
  empty: {
    color: '#999',
  },
  center: {
    padding:   '4rem',
    textAlign: 'center',
    color:     '#666',
  },
};