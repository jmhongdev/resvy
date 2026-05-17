import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>Resvy</Link>

      <div style={styles.links}>
        <Link to="/"            style={styles.link}>Amenities</Link>
        <Link to="/my-bookings" style={styles.link}>My Bookings</Link>
        {isAdmin && (
          <Link to="/admin" style={styles.link}>Admin</Link>
        )}
      </div>

      <div style={styles.right}>
        <span style={styles.userName}>{user?.name}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '0 1.5rem',
    height:          '60px',
    background:      '#fff',
    borderBottom:    '1px solid #eee',
    position:        'sticky',
    top:             0,
    zIndex:          100,
  },
  brand: {
    fontSize:       '1.25rem',
    fontWeight:     700,
    color:          '#2563eb',
    textDecoration: 'none',
  },
  links: {
    display: 'flex',
    gap:     '1.5rem',
  },
  link: {
    color:          '#444',
    textDecoration: 'none',
    fontSize:       '0.9rem',
    fontWeight:     500,
  },
  right: {
    display:    'flex',
    alignItems: 'center',
    gap:        '1rem',
  },
  userName: {
    fontSize: '0.875rem',
    color:    '#666',
  },
  logoutBtn: {
    padding:      '0.4rem 0.875rem',
    background:   'transparent',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.875rem',
    color:        '#444',
  },
};