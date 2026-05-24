import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuth } from '../context/useAuth';

// Password strength logic

interface PasswordStrength {
  score:   number;   
  label:   string;
  color:   string;
}

interface PasswordRule {
  label: string;
  met:   boolean;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8)                    score++;
  if (/[A-Z]/.test(password))                  score++;
  if (/[0-9]/.test(password))                  score++;
  if (/[^A-Za-z0-9]/.test(password))           score++;

  const levels = [
    { score: 0, label: '',          color: '#e5e7eb' },
    { score: 1, label: 'Weak',      color: '#ef4444' },
    { score: 2, label: 'Fair',      color: '#f97316' },
    { score: 3, label: 'Good',      color: '#eab308' },
    { score: 4, label: 'Strong',    color: '#22c55e' },
  ];

  return levels[score];
}

function getPasswordRules(password: string): PasswordRule[] {
  return [
    { label: 'At least 8 characters',           met: password.length >= 8 },
    { label: 'At least one uppercase letter',    met: /[A-Z]/.test(password) },
    { label: 'At least one number',              met: /[0-9]/.test(password) },
    { label: 'At least one special character',   met: /[^A-Za-z0-9]/.test(password) },
  ];
}

// Component

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
  const [showRules,       setShowRules]       = useState(false);

  const strength      = getPasswordStrength(password);
  const rules         = getPasswordRules(password);
  const allRulesMet   = rules.every(r => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation before hitting the API
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

          {/* Name */}
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

          {/* Email */}
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

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setShowRules(true);
              }}
              style={styles.input}
              placeholder="Min 8 characters"
              required
            />

            {/* Strength bar that only shows when user starts typing */}
            {password.length > 0 && (
              <div style={styles.strengthContainer}>
                <div style={styles.strengthBar}>
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      style={{
                        ...styles.strengthSegment,
                        background: strength.score >= level
                          ? strength.color
                          : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>
                {strength.label && (
                  <span style={{ ...styles.strengthLabel, color: strength.color }}>
                    {strength.label}
                  </span>
                )}
              </div>
            )}

            {/* Password rules that show when user focuses password field */}
            {showRules && (
              <div style={styles.rulesBox}>
                {rules.map(rule => (
                  <div key={rule.label} style={styles.rule}>
                    <span style={{
                      ...styles.ruleIcon,
                      color: rule.met ? '#22c55e' : '#9ca3af',
                    }}>
                      {rule.met ? '✓' : '○'}
                    </span>
                    <span style={{
                      ...styles.ruleLabel,
                      color: rule.met ? '#166534' : '#6b7280',
                    }}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm password */}
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
                fontSize: '0.8rem',
                color: passwordsMatch ? '#22c55e' : '#ef4444',
                marginTop: '0.25rem',
              }}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </span>
            )}
          </div>

          {/* Building code */}
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
  strengthContainer: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.75rem',
    marginTop:  '0.5rem',
  },
  strengthBar: {
    display: 'flex',
    gap:     '4px',
    flex:    1,
  },
  strengthSegment: {
    flex:         1,
    height:       '4px',
    borderRadius: '2px',
    transition:   'background 0.3s',
  },
  strengthLabel: {
    fontSize:   '0.75rem',
    fontWeight: 500,
    minWidth:   '48px',
  },
  rulesBox: {
    background:   '#f9fafb',
    border:       '1px solid #e5e7eb',
    borderRadius: '8px',
    padding:      '0.75rem',
    marginTop:    '0.5rem',
    display:      'flex',
    flexDirection: 'column',
    gap:          '0.4rem',
  },
  rule: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.5rem',
  },
  ruleIcon: {
    fontSize:   '0.875rem',
    fontWeight: 700,
    width:      '16px',
  },
  ruleLabel: {
    fontSize: '0.8rem',
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