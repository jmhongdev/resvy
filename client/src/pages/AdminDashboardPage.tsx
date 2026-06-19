import { useState, useEffect } from 'react';
import { getOverview, getAmenityStats, getPeakHours } from '../api/stats';
import type { OverviewStats, AmenityStat, PeakHour } from '../api/stats';

export default function AdminDashboardPage() {
  const [overview,  setOverview]  = useState<OverviewStats | null>(null);
  const [amenities, setAmenities] = useState<AmenityStat[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [ov, am, ph] = await Promise.all([
          getOverview(),
          getAmenityStats(),
          getPeakHours(),
        ]);
        setOverview(ov);
        setAmenities(am);
        setPeakHours(ph);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={styles.center}>Loading dashboard...</div>;
  if (error)   return <div style={styles.center}>{error}</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Admin Dashboard</h1>

      <div style={styles.statsGrid}>
        <StatCard
          label="Bookings this month"
          value={String(overview?.total_bookings_this_month ?? 0)}
        />
        <StatCard
          label="Most booked amenity"
          value={overview?.most_booked_amenity?.name ?? '—'}
        />
        <StatCard
          label="Busiest day"
          value={overview?.busiest_day?.day_name?.trim() ?? '—'}
        />
        <StatCard
          label="Cancellation rate"
          value={`${overview?.cancellation_rate_percent ?? 0}%`}
        />
      </div>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Amenity utilization (last 30 days)</h2>
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span>Amenity</span>
            <span>Bookings</span>
            <span>Utilization</span>
          </div>
          {amenities.map(a => (
            <div key={a.name} style={styles.tableRow}>
              <span>{a.name}</span>
              <span>{a.confirmed_bookings}</span>
              <span style={styles.utilRate}>
                {Number(a.utilization_rate_percent).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Peak hours</h2>
        {peakHours.length === 0 ? (
          <p style={styles.empty}>No data yet.</p>
        ) : (
          <div style={styles.peakGrid}>
            {peakHours.map(h => (
              <div key={h.hour} style={styles.peakCard}>
                <p style={styles.peakHour}>{h.hour_label}</p>
                <p style={styles.peakCount}>{h.booking_count} bookings</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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