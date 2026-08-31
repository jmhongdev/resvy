import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { getAmenities, updateAmenitySettings, getAmenityHolidays, addAmenityHoliday, deleteAmenityHoliday } from '../api/amenities';
import type { Amenity, Holiday } from '../api/amenities';
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DEFAULT_WINDOW_START = '09:00';
const DEFAULT_WINDOW_END = '18:00';


//Error message to keep the server/client messages. This will make failures diagnosable.
function getErrorMessage(error: unknown, fallback:string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminAmenitiesPage() {
  const [amenities, setAmenities]       = useState<Amenity[]>([]);
  const [selectedId, setSelectedId]      = useState<string | null>(null);
  const [holidays, setHolidays]        = useState<Holiday[]>([]);

  //Changed to use use independent loading states
  //Separate states to prevent the old holidary list from being presented
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [saving, setSaving]          = useState(false);
  const [addingHoliday, setAddingHoliday]    = useState(false);
  const [deletingHolidayDate, setDeletingHolidayDate] =
  useState<string | null>(null);

  //Errors are scoped to the feature that produced them.
  const [pageError, setPageError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Settings form state
  const [winStart, setWinStart]        = useState(DEFAULT_WINDOW_START);
  const [winEnd, setWinEnd]          = useState(DEFAULT_WINDOW_END);
  const [closedWeekdays, setClosedWeekdays]  = useState<number[]>([]);
  const [hasWindow, setHasWindow]       = useState(false);

  // Holiday form state
  const [newHolidayDate, setNewHolidayDate]  = useState('');
  const [newHolidayName, setNewHolidayName]  = useState('');

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

        const firstAmenity = data[0];
        const firstId = firstAmenity?.id ?? null;

        selectedIdRef.current = firstId;
        setSelectedId(firstId);

        if (firstAmenity) {
          const windowEnabled = Boolean(
            firstAmenity.booking_window_start &&
            firstAmenity.booking_window_end
          );

          setHasWindow(windowEnabled);
          setWinStart(
            firstAmenity.booking_window_start?.slice(0, 5) ??
              DEFAULT_WINDOW_START
          );
          setWinEnd(
            firstAmenity.booking_window_end?.slice(0, 5) ??
              DEFAULT_WINDOW_END
          );
          setClosedWeekdays(firstAmenity.closed_weekdays ?? []);
          setLoadingHolidays(true);
        }
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

  //Another useEffect. Holiday loading is driven by selectedId rather than being mixed into the click handler. when selectedId changes, React first runs the previous cleanup, setting 'active' to false. Older, slower requests cannot overwrite the holidays returned from the newest selection.
  useEffect(() => {
    if (!selectedId) return;

    let active = true;
    const amenityId = selectedId;

    async function loadHolidays() {
      try {
        const data = await getAmenityHolidays(amenityId);

        if (active) {
          setHolidays(data);
        }
      } catch (error) {
        if (active) {
          setHolidayError(
            getErrorMessage(error, 'Failed to load holidays')
          );
        }
      } finally {
        if (active) {
          setLoadingHolidays(false);
        }
      }
    }

    void loadHolidays();

    return () => {
      active = false;
    };
  }, [selectedId]);

  //Cancel UI timers when the component unmounts
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function selectAmenity(amenity: Amenity) {
    if (isMutating || amenity.id === selectedIdRef.current) return;

    const windowEnabled = Boolean(
      amenity.booking_window_start &&
      amenity.booking_window_end
    );

    selectedIdRef.current = amenity.id;
    setSelectedId(amenity.id);

    setHasWindow(windowEnabled);
    setWinStart(
      amenity.booking_window_start?.slice(0, 5) ??
        DEFAULT_WINDOW_START
    );
    setWinEnd(
      amenity.booking_window_end?.slice(0, 5) ??
        DEFAULT_WINDOW_END
    );
    setClosedWeekdays(amenity.closed_weekdays ?? []);

    setSettingsError('');
    setSuccessMsg('');

    setHolidays([]);
    setHolidayError('');
    setLoadingHolidays(true);
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

  //Now passes the full holiday object so confirmation and accessible button names
  //can identify the exact item rather than presenting many generic remove actions
  async function handleDeleteHoliday(holiday: Holiday) {
    const amenityId = selectedIdRef.current;
    if (!amenityId) return;
    if (!window.confirm(`Remove ${holiday.name} on ${holiday.date}?`)) return;

    setDeletingHolidayDate(holiday.date);
    setHolidayError('');

    try {
      await deleteAmenityHoliday(amenityId, holiday.date);
      if (selectedIdRef.current === amenityId) {
        setHolidays(previous =>
          previous.filter(item => item.date !== holiday.date)
        );
      }
    } catch (error) {
      if (selectedIdRef.current === amenityId) {
        setHolidayError(getErrorMessage(error, 'Failed to remove holiday'));
      }
    } finally {
      setDeletingHolidayDate(null);
    }
  }

  // Loading, failure and empty data are three different states now.
  if (loadingAmenities) {
    return (
      <div style={styles.center} role="status" aria-live="polite">
        Loading amenities...
      </div>
    );
  }

  if (pageError) {
    return (
      <div style={styles.center}>
        <div style={styles.error} role="alert">{pageError}</div>
      </div>
    );
  }

  if (amenities.length === 0) {
    return <div style={styles.center}>No amenities are available to configure.</div>;
  }

  return (
    // main , nav, section added to make the page easier to navigate.
    <main style={styles.page}>
      <h1 style={styles.title}>Amenity Settings</h1>

      <div style={styles.layout}>
        <nav style={styles.sidebar} aria-label="Amenities">
          {amenities.map(amenity => {
            const selected = amenity.id === selectedId;
            return (
              <button
                key={amenity.id}
                type="button"
                onClick={() => selectAmenity(amenity)}
                disabled={isMutating}
                aria-pressed={selected}
                style={{
                  ...styles.sidebarItem,
                  ...(selected ? styles.sidebarItemActive : {}),
                  ...(isMutating ? styles.controlDisabled : {}),
                }}
              >
                <span style={styles.sidebarName}>{amenity.name}</span>
                {amenity.location && (
                  <span style={styles.sidebarLocation}>{amenity.location}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Settings panel */}
        {selectedAmenity && (
          <section style={styles.panel} aria-labelledby="amenity-settings-title">
            <h2 id="amenity-settings-title" style={styles.panelTitle}>
              {selectedAmenity.name}
            </h2>

            {settingsError && (
              //Alerts now announced when async error appears.
              <div style={styles.error} role="alert">{settingsError}</div>
            )}
            {successMsg && (
              <div style={styles.success} role="status" aria-live="polite">
                {successMsg}
              </div>
            )}

            {/* Booking window */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Booking window</h3>
              <p style={styles.sectionDesc}>
                Restrict when residents can make bookings. If disabled, bookings are
                accepted 24/7.
              </p>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hasWindow}
                  onChange={event => setHasWindow(event.target.checked)}
                />
                Enable booking window
              </label>

              {hasWindow && (
                <div style={styles.timeRow}>
                  <div style={styles.field}>
                    <label htmlFor="booking-window-start" style={styles.label}>
                      Opens at
                    </label>
                    <input
                      id="booking-window-start"
                      type="time"
                      value={winStart}
                      onChange={event => setWinStart(event.target.value)}
                      style={styles.timeInput}
                      required
                    />
                  </div>
                  <span style={styles.timeSeparator} aria-hidden="true">–</span>
                  <div style={styles.field}>
                    <label htmlFor="booking-window-end" style={styles.label}>
                      Closes at
                    </label>
                    <input
                      id="booking-window-end"
                      type="time"
                      value={winEnd}
                      onChange={event => setWinEnd(event.target.value)}
                      style={styles.timeInput}
                      required
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

              <div style={styles.weekdayGrid} aria-label="Closed weekdays">
                {WEEKDAY_LABELS.map((label, day) => {
                  const closed = closedWeekdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      aria-pressed={closed}
                      aria-label={`${label}: ${closed ? 'closed' : 'open'}`}
                      style={{
                        ...styles.weekdayBtn,
                        ...(closed ? styles.weekdayBtnClosed : {}),
                      }}
                    >
                      <span>{WEEKDAY_LABELS_KO[day]}</span>
                      <span style={styles.weekdayEn}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSaveSettings()}
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

              {holidayError && (
                <div style={styles.error} role="alert">{holidayError}</div>
              )}

              {/* Existing holidays */}
              {loadingHolidays ? (
                <p style={styles.empty} role="status">Loading holidays...</p>
              ) : holidays.length === 0 ? (
                <p style={styles.empty}>No holidays added yet.</p>
              ) : (
                <div style={styles.holidayList}>
                  {holidays.map(holiday => {
                    const deleting = deletingHolidayDate === holiday.date;
                    return (
                      <div key={holiday.date} style={styles.holidayItem}>
                        <div>
                          <p style={styles.holidayDate}>{holiday.date}</p>
                          <p style={styles.holidayName}>{holiday.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteHoliday(holiday)}
                          style={styles.deleteBtn}
                          disabled={deletingHolidayDate !== null}
                           aria-label={`Remove ${holiday.name} on ${holiday.date}`}
                        >
                          {deleting ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add holiday form */}
              <form onSubmit={handleAddHoliday} style={styles.addHolidayForm}>
                <div style={styles.field}>
                  <label htmlFor="holiday-date" style={styles.label}>Date</label>
                  <input
                    id="holiday-date"
                    type="date"
                    value={newHolidayDate}
                    onChange={event => setNewHolidayDate(event.target.value)}
                    style={styles.dateInput}
                    required
                  />
                </div>
                <div style={{ ...styles.field, flex: 1 }}>
                  <label htmlFor="holiday-name" style={styles.label}>Holiday name</label>
                  <input
                    id="holiday-name"
                    type="text"
                    value={newHolidayName}
                    onChange={event => setNewHolidayName(event.target.value)}
                    style={styles.textInput}
                    placeholder="e.g. 추석"
                    maxLength={100}
                    required
                  />
                </div>
                <button
                  type="submit"
                  style={addingHoliday ? styles.buttonDisabled : styles.addBtn}
                  disabled={addingHoliday || loadingHolidays}
                >
                  {addingHoliday ? 'Adding...' : 'Add'}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
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