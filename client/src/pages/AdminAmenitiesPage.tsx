import { useState, useEffect } from 'react';
import { getAmenities, updateAmenitySettings, getAmenityHolidays, addAmenityHoliday, deleteAmenityHoliday } from '../api/amenities';
import type { Amenity, Holiday } from '../api/amenities';
import type { CSSProperties, FormEvent } from 'react';
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'];

//Error message to keep the server/client messages. This will make failures diagnosable.
function getErrorMessage(error: unknown, fallback:string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminAmenitiesPage() {
  const [amenities,       setAmenities]       = useState<Amenity[]>([]);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [holidays,        setHolidays]        = useState<Holiday[]>([]);

  //Changed to use use independent loading states
  //Separate states to prevent the old holidary list from being presented
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [addingHoliday,    setAddingHoliday]    = useState(false);
  const [deletingHoliday,   setDeletingHolidayDate]   = useState(false);
  useState<string | null>(null);

  //Errors are scoped to the feature that produced them.
  const [pageError, setPageError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Settings form state
  const [winStart,        setWinStart]        = useState(DEFAULT_WINDOW_START);
  const [winEnd,          setWinEnd]          = useState(DEFAULT_WINDOW_START);
  const [closedWeekdays,  setClosedWeekdays]  = useState<number[]>([]);
  const [hasWindow,       setHasWindow]       = useState(false);

  // Holiday form state
  const [newHolidayDate,  setNewHolidayDate]  = useState('');
  const [newHolidayName,  setNewHolidayName]  = useState('');

  // Refs will hold values needed by asynchronous callbacks without waiting for a React render. A mutation captures its starting amenity ID, then compares it with selectedIdRef before changing visible state. 
  const selectedIdRef = useRef<string | null>(null);
  
  // Keep timeout handle allows the cancelling of an older notification timer. Otherwise, the first save's timer could prematurely clear a later save's success message
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive the selected object instead of storing a second copy of it.
  const selectedAmenity = useMemo(
    () => amenities.find(amenity => amenity.id === selectedId),
    [amenities, selectedId]
  );

  //Selection is temporarily locked during writes. 
  const isMutating = saving || addingHoliday || deletingHolidayDate !== null;

  //Initial request has an active cleanup guard. React strict mode mounts effects twice in development, and navigation can unmount this page while a request is pending. A late respone is ignored instead of writing state into an obsolete effect instance. 
  useEffect(() => {
    let active = true;

    async function loadAmenities() {
      setLoadingAmenities(true);
      setPageError('');

      try {
        const data = await getAmenities();
        if (!active) return;

        setAmenities(data);
        const firstId = data[0]?.id ?? null;
        selectedIdRef.current = firstId;
        setSelectedId(firstId);
      } catch (error) {
        if (active) {
          setPageError(getErrorMessage(error, 'Failed to load amenities'));
        }
      } finally {
        if (active) setLoadingAmenities(false);
      }
    }

    void loadAmenities();

    return () => {
      active = false;
    };
  }, []);

  //Form state is populated whenever the selected amenity object changes. Requiring both window values avoids checking a half-configured backend record as an enabled window.
  useEffect(() => {
    if (!selectedAmenity) return;

    const windowEnabled = Boolean(
      selectedAmenity.booking_window_start && selectedAmenity.booking_window_end
    );

    setHasWindow(windowEnabled);
    setWinStart(
      selectedAmenity.booking_window_start?.slice(0, 5) ?? DEFAULT_WINDOW_START
    );
    setWinEnd(
      selectedAmenity.booking_window_end?.slice(0, 5) ?? DEFAULT_WINDOW_END
    );
    setClosedWeekdays(selectedAmenity.closed_weekdays ?? []);
    setSettingsError('');
    setSuccessMsg('');
  }, [selectedAmenity]);

  //Another useEffect. Holiday loading is driven by selectedId rather than being mixed into the click handler. when selectedId changes, React first runs the previous cleanup, setting 'active' to false. Older, slower requests cannot overwrite the holidays returned from the newest selection.
  useEffect(() => {
    if (!selectedId) {
      setHolidays([]);
      return;
    }

    let active = true;
    const amenityId = selectedId;

    async function loadHolidays() {
      setLoadingHolidays(true);
      setHolidayError('');

      // Do not show amenity A's holidays while amenity B is loading.
      setHolidays([]);

      try {
        const data = await getAmenityHolidays(amenityId);
        if (active) setHolidays(data);
      } catch (error) {
        if (active) {
          setHolidayError(getErrorMessage(error, 'Failed to load holidays'));
        }
      } finally {
        if (active) setLoadingHolidays(false);
      }
    }

    void loadHolidays();

    return () => {
      active = false;
    };
  }, [selectedId]);

  //Cacnel UI timers when the component unmounts
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function selectAmenity(amenityId: string) {
    // Ignore repeated selection and do not allow navigation in the middle of a write. The ref is updated synchronously so pending callbacks see the new ID.
    if (isMutating || amenityId === selectedIdRef.current) return;

    selectedIdRef.current = amenityId;
    setSelectedId(amenityId);
    setNewHolidayDate('');
    setNewHolidayName('');
  }

  function toggleWeekday(day: number) {
    //Sorting gives the API a deterministic payload
    setClosedWeekdays(previous =>
      previous.includes(day)
        ? previous.filter(value => value !== day)
        : [...previous, day].sort((a, b) => a - b)
    );
  }

  // Validate the relationship between booking-window fields before the network request.
  function validateWindow(): string | null {
    if (!hasWindow) return null;
    if (!winStart || !winEnd) return 'Both booking-window times are required.';
    if (winStart >= winEnd) {
      return 'The opening time must be earlier than the closing time.';
    }
    return null;
  }


  async function handleSaveSettings() {
    //Capture the target once.
    const amenityId = selectedIdRef.current;
    if (!amenityId) return;

    const validationError = validateWindow();
    if (validationError) {
      setSettingsError(validationError);
      setSuccessMsg('');
      return;
    }

    const settings = {
      booking_window_start: hasWindow ? winStart : null,
      booking_window_end: hasWindow ? winEnd : null,
      closed_weekdays: closedWeekdays,
    };

    setSaving(true);
    setSettingsError('');
    setSuccessMsg('');

    try {
      await updateAmenitySettings(amenityId, settings);

      setAmenities(previous =>
        previous.map(amenity =>
          amenity.id === amenityId ? { ...amenity, ...settings } : amenity
        )
      );

      //ref check is defensive
      if (selectedIdRef.current === amenityId) {
        setSuccessMsg('Settings saved successfully');
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (error) {
      if (selectedIdRef.current === amenityId) {
        setSettingsError(getErrorMessage(error, 'Failed to save settings'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amenityId = selectedIdRef.current;
    const holidayName = newHolidayName.trim();
    if (!amenityId || !newHolidayDate) return;

    if (!holidayName) {
      setHolidayError('Holiday name cannot be blank.');
      return;
    }

    setAddingHoliday(true);
    setHolidayError('');

    try {
      const holiday = await addAmenityHoliday(
        amenityId,
        newHolidayDate,
        holidayName
      );

      if (selectedIdRef.current === amenityId) {
        setHolidays(previous =>
          [...previous, holiday].sort((a, b) => a.date.localeCompare(b.date))
        );
        setNewHolidayDate('');
        setNewHolidayName('');
      }
    } catch (error) {
      if (selectedIdRef.current === amenityId) {
        setHolidayError(getErrorMessage(error, 'Failed to add holiday'));
      }
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