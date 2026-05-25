import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: saveAuth } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    // Prevent the browser from refreshing the page on form submit
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      // Save user + tokens to context and localStorage
      saveAuth(result.user, result.accessToken, result.refreshToken);

      // Redirect to home page
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Resvy</h1>
        <p style={styles.subtitle}>Apartment amenity booking</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={{
              ...styles.error,
              ...(error.includes('locked') ? styles.errorLocked : {}),
            }}>
              {error.includes('locked') && (
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Account locked
                </span>
              )}
              {error}
            </div>
          )}

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
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            style={loading ? styles.buttonDisabled : styles.button}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Register</Link>
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
    maxWidth:     '400px',
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
  errorLocked: {
  background: '#fef3c7',
  border:     '1px solid #fcd34d',
  color:      '#92400e',
  },
};