import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function navLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
    return {
      ...styles.link,
      color:         isActive ? '#2563eb' : '#444',
      borderBottom:  isActive ? '2px solid #2563eb' : '2px solid transparent',
      paddingBottom: '2px',
    };
  }

  return (
    <nav style={styles.nav}>
      <NavLink to="/" style={styles.brand}>Resvy</NavLink>

      <div style={styles.links}>
        <NavLink to="/"            style={navLinkStyle} end>Amenities</NavLink>
        {!isAdmin && (
          <NavLink to="/my-bookings" style={navLinkStyle}>My Bookings</NavLink>
        )}
        {isAdmin && (
          <>
            <NavLink to="/admin"          style={navLinkStyle}>Dashboard</NavLink>
            <NavLink to="/admin/bookings" style={navLinkStyle}>Bookings</NavLink>
            <NavLink to="/admin/amenities" style={navLinkStyle}>Amenities</NavLink>
          </>
        )}
      </div>

      <div style={styles.right}>
        <NavLink to="/profile" style={navLinkStyle}>{user?.name}</NavLink>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 1.5rem',
    height:         '60px',
    background:     '#fff',
    borderBottom:   '1px solid #eee',
    position:       'sticky',
    top:            0,
    zIndex:         100,
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
  logoutBtn: {
    padding:      '0.4rem 0.875rem',
    background:   'transparent',
    border:       '1px solid #ddd',
    borderRadius: '8px',
    fontSize:     '0.875rem',
    color:        '#444',
  },
};