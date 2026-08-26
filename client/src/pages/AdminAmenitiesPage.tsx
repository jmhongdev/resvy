import { useState, useEffect } from 'react';
import { getAmenities, updateAmenitySettings, getAmenityHolidays, addAmenityHoliday, deleteAmenityHoliday } from '../api/amenities';
import type { Amenity, Holiday } from '../api/amenities';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function AdminAmenitiesPage() {
  const [amenities,       setAmenities]       = useState<Amenity[]>([]);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [holidays,        setHolidays]        = useState<Holiday[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');
  const [successMsg,      setSuccessMsg]      = useState('');

  // Settings form state
  const [winStart,        setWinStart]        = useState('');
  const [winEnd,          setWinEnd]          = useState('');
  const [closedWeekdays,  setClosedWeekdays]  = useState<number[]>([]);
  const [hasWindow,       setHasWindow]       = useState(false);

  // Holiday form state
  const [newHolidayDate,  setNewHolidayDate]  = useState('');
  const [newHolidayName,  setNewHolidayName]  = useState('');
  const [addingHoliday,   setAddingHoliday]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAmenities();
        setAmenities(data);
        if (data.length > 0) selectAmenity(data[0]);
      } catch {
        setError('Failed to load amenities');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function selectAmenity(amenity: Amenity) {
    setSelectedId(amenity.id);
    setError('');
    setSuccessMsg('');

    // Populate settings form
    setHasWindow(!!amenity.booking_window_start);
    setWinStart(amenity.booking_window_start?.slice(0, 5) ?? '09:00');
    setWinEnd(amenity.booking_window_end?.slice(0, 5)     ?? '18:00');
    setClosedWeekdays(amenity.closed_weekdays ?? []);

    // Load holidays
    try {
      const h = await getAmenityHolidays(amenity.id);
      setHolidays(h);
    } catch {
      setHolidays([]);
    }
  }

  function toggleWeekday(day: number) {
    setClosedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  async function handleSaveSettings() {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const settings = {
        booking_window_start: hasWindow ? winStart : null,
        booking_window_end:   hasWindow ? winEnd   : null,
        closed_weekdays:      closedWeekdays,
      };

      await updateAmenitySettings(selectedId, settings);

      // Update local amenity list
      const updated = await getAmenities();
      setAmenities(updated);

      setSuccessMsg('Settings saved successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !newHolidayDate || !newHolidayName) return;
    setAddingHoliday(true);
    setError('');

    try {
      const holiday = await addAmenityHoliday(selectedId, newHolidayDate, newHolidayName);
      setHolidays(prev => [...prev, holiday].sort((a, b) => a.date.localeCompare(b.date)));
      setNewHolidayDate('');
      setNewHolidayName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holiday');
    } finally {
      setAddingHoliday(false);
    }
  }

  async function handleDeleteHoliday(date: string) {
    if (!selectedId) return;
    if (!confirm(`Remove holiday on ${date}?`)) return;
    try {
      await deleteAmenityHoliday(selectedId, date);
      setHolidays(prev => prev.filter(h => h.date !== date));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove holiday');
    }
  }

  const selectedAmenity = amenities.find(a => a.id === selectedId);

  if (loading) return <div style={styles.center}>Loading...</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Amenity Settings</h1>

      <div style={styles.layout}>
        {/* Amenity list sidebar */}
        <div style={styles.sidebar}>
          {amenities.map(a => (
            <button
              key={a.id}
              onClick={() => selectAmenity(a)}
              style={{
                ...styles.sidebarItem,
                ...(a.id === selectedId ? styles.sidebarItemActive : {}),
              }}
            >
              <span style={styles.sidebarName}>{a.name}</span>
              <span style={styles.sidebarLocation}>{a.location}</span>
            </button>
          ))}
        </div>

        {/* Settings panel */}
        {selectedAmenity && (
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>{selectedAmenity.name}</h2>

            {error      && <div style={styles.error}>{error}</div>}
            {successMsg && <div style={styles.success}>{successMsg}</div>}

            {/* Booking window */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Booking window</h3>
              <p style={styles.sectionDesc}>
                Restrict when residents can make bookings. If disabled, bookings are accepted 24/7.
              </p>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hasWindow}
                  onChange={e => setHasWindow(e.target.checked)}
                />
                Enable booking window
              </label>

              {hasWindow && (
                <div style={styles.timeRow}>
                  <div style={styles.field}>
                    <label style={styles.label}>Opens at</label>
                    <input
                      type="time"
                      value={winStart}
                      onChange={e => setWinStart(e.target.value)}
                      style={styles.timeInput}
                    />
                  </div>
                  <span style={styles.timeSeparator}>—</span>
                  <div style={styles.field}>
                    <label style={styles.label}>Closes at</label>
                    <input
                      type="time"
                      value={winEnd}
                      onChange={e => setWinEnd(e.target.value)}
                      style={styles.timeInput}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Closed weekdays */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Closed days of the week</h3>
              <p style={styles.sectionDesc}>
                Select days this amenity is closed every week.
              </p>

              <div style={styles.weekdayGrid}>
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    onClick={() => toggleWeekday(day)}
                    style={{
                      ...styles.weekdayBtn,
                      ...(closedWeekdays.includes(day) ? styles.weekdayBtnClosed : {}),
                    }}
                  >
                    <span>{WEEKDAY_LABELS_KO[day]}</span>
                    <span style={styles.weekdayEn}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              style={saving ? styles.buttonDisabled : styles.button}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>

            {/* Holidays */}
            <div style={{ ...styles.section, marginTop: '2rem' }}>
              <h3 style={styles.sectionTitle}>Holidays</h3>
              <p style={styles.sectionDesc}>
                Dates this amenity is closed. Residents cannot book on these days.
              </p>

              {/* Existing holidays */}
              {holidays.length === 0 ? (
                <p style={styles.empty}>No holidays added yet.</p>
              ) : (
                <div style={styles.holidayList}>
                  {holidays.map(h => (
                    <div key={h.date} style={styles.holidayItem}>
                      <div>
                        <p style={styles.holidayDate}>{h.date}</p>
                        <p style={styles.holidayName}>{h.name}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.date)}
                        style={styles.deleteBtn}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add holiday form */}
              <form onSubmit={handleAddHoliday} style={styles.addHolidayForm}>
                <div style={styles.field}>
                  <label style={styles.label}>Date</label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={e => setNewHolidayDate(e.target.value)}
                    style={styles.dateInput}
                    required
                  />
                </div>
                <div style={{ ...styles.field, flex: 1 }}>
                  <label style={styles.label}>Holiday name</label>
                  <input
                    type="text"
                    value={newHolidayName}
                    onChange={e => setNewHolidayName(e.target.value)}
                    style={styles.textInput}
                    placeholder="e.g. 추석"
                    required
                  />
                </div>
                <button
                  type="submit"
                  style={addingHoliday ? styles.buttonDisabled : styles.addBtn}
                  disabled={addingHoliday}
                >
                  {addingHoliday ? 'Adding...' : 'Add'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
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
  layout: {
    display: 'flex',
    gap:     '1.5rem',
  },
  sidebar: {
    width:         '200px',
    flexShrink:    0,
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.5rem',
  },
  sidebarItem: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'flex-start',
    padding:       '0.75rem 1rem',
    background:    '#fff',
    border:        '1px solid #eee',
    borderRadius:  '10px',
    cursor:        'pointer',
    textAlign:     'left',
  },
  sidebarItemActive: {
    background:  '#eff6ff',
    border:      '1px solid #bfdbfe',
  },
  sidebarName: {
    fontSize:   '0.9rem',
    fontWeight: 600,
    color:      '#1a1a1a',
  },
  sidebarLocation: {
    fontSize:  '0.775rem',
    color:     '#888',
    marginTop: '0.15rem',
  },
  panel: {
    flex:         1,
    background:   '#fff',
    borderRadius: '12px',
    padding:      '1.5rem',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
  },
  panelTitle: {
    fontSize:     '1.1rem',
    fontWeight:   600,
    color:        '#1a1a1a',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #f0f0f0',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize:     '0.9rem',
    fontWeight:   600,
    color:        '#333',
    marginBottom: '0.25rem',
  },
  sectionDesc: {
    fontSize:     '0.8rem',
    color:        '#888',
    marginBottom: '0.75rem',
  },
  checkboxLabel: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.5rem',
    fontSize:   '0.875rem',
    color:      '#333',
    cursor:     'pointer',
  },
  timeRow: {
    display:    'flex',
    alignItems: 'flex-end',
    gap:        '0.75rem',
    marginTop:  '0.75rem',
  },
  timeSeparator: {
    fontSize:     '1rem',
    color:        '#999',
    marginBottom: '0.5rem',
  },
  field: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.25rem',
  },
  label: {
    fontSize:   '0.775rem',
    fontWeight: 500,
    color:      '#555',
  },
  timeInput: {
    padding:      '0.5rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.9rem',
  },
  weekdayGrid: {
    display: 'flex',
    gap:     '0.5rem',
    flexWrap: 'wrap',
  },
  weekdayBtn: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    padding:       '0.5rem 0.75rem',
    background:    '#f9fafb',
    border:        '1px solid #e5e7eb',
    borderRadius:  '8px',
    fontSize:      '0.875rem',
    fontWeight:    500,
    color:         '#444',
    cursor:        'pointer',
    minWidth:      '52px',
  },
  weekdayBtnClosed: {
    background:  '#fef2f2',
    border:      '1px solid #fecaca',
    color:       '#dc2626',
  },
  weekdayEn: {
    fontSize:  '0.7rem',
    color:     '#999',
    marginTop: '0.15rem',
  },
  button: {
    padding:      '0.75rem 1.5rem',
    background:   '#2563eb',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '0.9rem',
    fontWeight:   500,
  },
  buttonDisabled: {
    padding:      '0.75rem 1.5rem',
    background:   '#93c5fd',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '0.9rem',
    fontWeight:   500,
  },
  addBtn: {
    padding:      '0.5rem 1rem',
    background:   '#2563eb',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '0.875rem',
    fontWeight:   500,
    alignSelf:    'flex-end',
  },
  holidayList: {
    marginBottom: '1rem',
    display:      'flex',
    flexDirection: 'column',
    gap:          '0.5rem',
  },
  holidayItem: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '0.75rem 1rem',
    background:     '#fef2f2',
    borderRadius:   '8px',
    border:         '1px solid #fecaca',
  },
  holidayDate: {
    fontSize:   '0.875rem',
    fontWeight: 600,
    color:      '#1a1a1a',
  },
  holidayName: {
    fontSize:  '0.775rem',
    color:     '#666',
    marginTop: '0.1rem',
  },
  deleteBtn: {
    padding:      '0.3rem 0.75rem',
    background:   'transparent',
    border:       '1px solid #fca5a5',
    borderRadius: '6px',
    color:        '#dc2626',
    fontSize:     '0.775rem',
  },
  addHolidayForm: {
    display:    'flex',
    alignItems: 'flex-end',
    gap:        '0.75rem',
    flexWrap:   'wrap',
  },
  dateInput: {
    padding:      '0.5rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.9rem',
  },
  textInput: {
    padding:      '0.5rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.9rem',
    width:        '100%',
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
  empty: {
    color:        '#999',
    fontSize:     '0.875rem',
    marginBottom: '0.75rem',
  },
  center: {
    padding:   '4rem',
    textAlign: 'center',
    color:     '#666',
  },
};