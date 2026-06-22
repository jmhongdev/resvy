import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuth } from '../context/useAuth';
import { getPasswordRules } from '../utils/passwordStrength';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login: saveAuth } = useAuth();

  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [buildingCode,    setBuildingCode]    = useState('');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const allRulesMet = getPasswordRules(password).every(r => r.met);
    if (!allRulesMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await register(name, email, password, buildingCode);
      saveAuth(result.user, result.accessToken, result.refreshToken);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Join Resvy</h1>
        <p style={styles.subtitle}>Enter your building code to get started</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={styles.input}
              placeholder="Your name"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Min 8 characters"
              required
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{
                ...styles.input,
                borderColor: confirmPassword.length > 0
                  ? passwordsMatch ? '#22c55e' : '#ef4444'
                  : '#ddd',
              }}
              placeholder="Re-enter your password"
              required
            />
            {confirmPassword.length > 0 && (
              <span style={{
                fontSize:  '0.8rem',
                color:     passwordsMatch ? '#22c55e' : '#ef4444',
                marginTop: '0.25rem',
              }}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </span>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Building code</label>
            <input
              type="text"
              value={buildingCode}
              onChange={e => setBuildingCode(e.target.value.toUpperCase())}
              style={styles.input}
              placeholder="e.g. DEMO-BUILD1"
              required
            />
          </div>

          <button
            type="submit"
            style={loading ? styles.buttonDisabled : styles.button}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     '#f5f5f5',
    padding:        '1rem',
  },
  card: {
    background:   '#fff',
    borderRadius: '12px',
    padding:      '2rem',
    width:        '100%',
    maxWidth:     '420px',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize:   '1.75rem',
    fontWeight: 700,
    color:      '#1a1a1a',
  },
  subtitle: {
    color:        '#666',
    marginBottom: '1.5rem',
    fontSize:     '0.9rem',
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
    transition:   'border-color 0.2s',
  },
  error: {
    background:   '#fef2f2',
    border:       '1px solid #fecaca',
    borderRadius: '8px',
    padding:      '0.75rem',
    color:        '#dc2626',
    fontSize:     '0.875rem',
  },
  button: {
    padding:      '0.75rem',
    background:   '#2563eb',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '1rem',
    fontWeight:   500,
    marginTop:    '0.5rem',
  },
  buttonDisabled: {
    padding:      '0.75rem',
    background:   '#93c5fd',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    fontSize:     '1rem',
    fontWeight:   500,
    marginTop:    '0.5rem',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize:  '0.875rem',
    color:     '#666',
  },
  link: {
    color:          '#2563eb',
    textDecoration: 'none',
    fontWeight:     500,
  },
};