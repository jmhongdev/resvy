import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

interface Props {
  children:      React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin }: Props) {
  const { user, loading } = useAuth();

  // Wait for localStorage check to complete before deciding
  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  // Not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin on an admin route , redirect home
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}