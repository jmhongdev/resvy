import { useState, useEffect } from 'react';
import { getProfile, updateName, changePassword } from '../api/users';
import type { UserProfile } from '../api/users';
import { getPasswordRules } from '../utils/passwordStrength';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { getMyBookings } from '../api/bookings';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [newName,     setNewName]     = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError,   setNameError]   = useState('');
  const [nameSaving,  setNameSaving]  = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess,       setPwSuccess]       = useState('');
  const [pwError,         setPwError]         = useState('');
  const [pwSaving,        setPwSaving]        = useState(false);

  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProfile();
        setProfile(data);
        setNewName(data.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadBookingSummary() {
      try {
        const data = await getMyBookings();
        const confirmed = data.upcoming.filter(b => b.status === 'confirmed').length;
        setUpcomingCount(confirmed);
      } catch {
        // Non-critical
      }
    }
    loadBookingSummary();
  }, []);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    setNameError('');
    setNameSuccess('');
    setNameSaving(true);

    try {
      const updated = await updateName(newName);
      setProfile(prev => prev ? { ...prev, name: updated.name } : prev);
      setEditingName(false);
      setNameSuccess('Name updated successfully');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setNameSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    const allRulesMet = getPasswordRules(newPassword).every(r => r.met);
    if (!allRulesMet) {
      setPwError('New password does not meet all requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    setPwSaving(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPwSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) return <div style={styles.center}>Loading profile...</div>;
  if (error)   return <div style={styles.center}>{error}</div>;
  if (!profile) return null;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Profile & Settings</h1>

      {/* Profile info card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Account information</h2>

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Name</p>
            {editingName ? (
              <form onSubmit={handleUpdateName} style={styles.inlineForm}>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  style={styles.inlineInput}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  style={styles.saveBtn}
                  disabled={nameSaving}
                >
                  {nameSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  style={styles.cancelInlineBtn}
                  onClick={() => {
                    setEditingName(false);
                    setNewName(profile.name);
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div style={styles.infoValueRow}>
                <p style={styles.infoValue}>{profile.name}</p>
                <button
                  onClick={() => setEditingName(true)}
                  style={styles.editBtn}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Email</p>
            <p style={styles.infoValue}>{profile.email}</p>
          </div>

          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Role</p>
            <span style={{
              ...styles.roleBadge,
              ...(profile.role === 'admin' ? styles.roleAdmin : styles.roleResident),
            }}>
              {profile.role}
            </span>
          </div>

          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Member since</p>
            <p style={styles.infoValue}>
              {new Date(profile.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>

        {nameSuccess && <div style={styles.success}>{nameSuccess}</div>}
        {nameError   && <div style={styles.error}>{nameError}</div>}
      </div>

      {/* Building info card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Building</h2>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Building name</p>
            <p style={styles.infoValue}>{profile.building_name}</p>
          </div>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Address</p>
            <p style={styles.infoValue}>{profile.building_address}</p>
          </div>
        </div>
      </div>

      {/* Booking summary card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Bookings</h2>
        <div style={styles.bookingSummary}>
          <div style={styles.bookingCount}>
            <p style={styles.bookingCountNumber}>
              {upcomingCount === null ? '—' : upcomingCount}
            </p>
            <p style={styles.bookingCountLabel}>upcoming booking{upcomingCount !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/my-bookings" style={styles.viewBookingsBtn}>
            View all bookings →
          </Link>
        </div>
      </div>

      {/* Change password card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Change password</h2>

        <form onSubmit={handleChangePassword} style={styles.form}>
          {pwError   && <div style={styles.error}>{pwError}</div>}
          {pwSuccess && <div style={styles.success}>{pwSuccess}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={styles.input}
              placeholder="Min 8 characters"
              required
            />
            <PasswordStrengthMeter password={newPassword} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{
                ...styles.input,
                borderColor: confirmPassword.length > 0
                  ? confirmPassword === newPassword ? '#22c55e' : '#ef4444'
                  : '#ddd',
              }}
              required
            />
            {confirmPassword.length > 0 && (
              <span style={{
                fontSize: '0.8rem',
                color: confirmPassword === newPassword ? '#22c55e' : '#ef4444',
                marginTop: '0.25rem',
              }}>
                {confirmPassword === newPassword
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </span>
            )}
          </div>

          <button
            type="submit"
            style={pwSaving ? styles.buttonDisabled : styles.button}
            disabled={pwSaving}
          >
            {pwSaving ? 'Changing...' : 'Change password'}
          </button>
        </form>
      </div>

      {/* Settings card — placeholder for future features */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Notifications</h2>
        <p style={styles.comingSoon}>
          Email notification settings coming soon.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '700px',
    margin:   '0 auto',
    padding:  '2rem 1rem',
  },
  title: {
    fontSize:     '1.75rem',
    fontWeight:   700,
    color:        '#1a1a1a',
    marginBottom: '1.5rem',
  },
  card: {
    background:    '#fff',
    borderRadius:  '12px',
    padding:       '1.5rem',
    boxShadow:     '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom:  '1rem',
  },
  cardTitle: {
    fontSize:     '1rem',
    fontWeight:   600,
    color:        '#1a1a1a',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #f0f0f0',
  },
  infoGrid: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 '1rem',
  },
  infoItem: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.25rem',
  },
  infoLabel: {
    fontSize:  '0.775rem',
    color:     '#888',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  infoValue: {
    fontSize:   '0.95rem',
    color:      '#1a1a1a',
    fontWeight: 500,
  },
  infoValueRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.75rem',
  },
  editBtn: {
    background:   'transparent',
    border:       '1px solid #ddd',
    borderRadius: '6px',
    padding:      '0.2rem 0.6rem',
    fontSize:     '0.775rem',
    color:        '#2563eb',
    cursor:       'pointer',
  },
  inlineForm: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.5rem',
  },
  inlineInput: {
    padding:      '0.35rem 0.6rem',
    border:       '1px solid #ddd',
    borderRadius: '6px',
    fontSize:     '0.9rem',
    flex:         1,
  },
  saveBtn: {
    padding:      '0.35rem 0.75rem',
    background:   '#2563eb',
    color:        '#fff',
    border:       'none',
    borderRadius: '6px',
    fontSize:     '0.8rem',
    fontWeight:   500,
  },
  cancelInlineBtn: {
    padding:      '0.35rem 0.75rem',
    background:   'transparent',
    border:       '1px solid #ddd',
    borderRadius: '6px',
    fontSize:     '0.8rem',
    color:        '#666',
  },
  roleBadge: {
    display:      'inline-block',
    fontSize:     '0.75rem',
    padding:      '0.2rem 0.6rem',
    borderRadius: '12px',
    fontWeight:   500,
    width:        'fit-content',
  },
  roleAdmin: {
    background: '#fef3c7',
    color:      '#92400e',
  },
  roleResident: {
    background: '#eff6ff',
    color:      '#1e40af',
  },
  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '1rem',
  },
  field: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.25rem',
  },
  label: {
    fontSize:   '0.875rem',
    fontWeight: 500,
    color:      '#333',
  },
  input: {
    padding:      '0.625rem 0.75rem',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '1rem',
    outline:      'none',
  },
  button: {
    padding:      '0.75rem',
    background:   '#2563eb',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '1rem',
    fontWeight:   500,
    alignSelf:    'flex-start',
  },
  buttonDisabled: {
    padding:      '0.75rem',
    background:   '#93c5fd',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '1rem',
    fontWeight:   500,
    alignSelf:    'flex-start',
  },
  error: {
    background:   '#fef2f2',
    border:       '1px solid #fecaca',
    borderRadius: '8px',
    padding:      '0.75rem',
    color:        '#dc2626',
    fontSize:     '0.875rem',
  },
  success: {
    background:   '#f0fdf4',
    border:       '1px solid #bbf7d0',
    borderRadius: '8px',
    padding:      '0.75rem',
    color:        '#16a34a',
    fontSize:     '0.875rem',
  },
  comingSoon: {
    color:     '#999',
    fontSize:  '0.9rem',
    fontStyle: 'italic',
  },
  center: {
    padding:   '4rem',
    textAlign: 'center',
    color:     '#666',
  },
  bookingSummary: {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  },
  bookingCount: {
    display:    'flex',
    alignItems: 'baseline',
    gap:        '0.5rem',
  },
  bookingCountNumber: {
    fontSize:   '2rem',
    fontWeight: 700,
    color:      '#2563eb',
  },
  bookingCountLabel: {
    fontSize: '0.9rem',
    color:    '#666',
  },
  viewBookingsBtn: {
    color:          '#2563eb',
    textDecoration: 'none',
    fontSize:       '0.875rem',
    fontWeight:     500,
  },
};