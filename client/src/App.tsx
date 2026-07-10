import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AmenitiesPage from './pages/AmenitiesPage';
import AvailabilityPage from './pages/AvailabilityPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import ProfilePage from './pages/ProfilePage';
import AdminAmenitiesPage from './pages/AdminAmenitiesPage';

function App() {
  const { user, loading } = useAuth();

  // Wait for auth state to initialize before rendering routes
  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <>
      {user && <Navbar />}

      <Routes>
        {/* Public routes, redirect to home if already logged in */}
        <Route path="/login"    element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AmenitiesPage />
          </ProtectedRoute>
        } />

        <Route path="/amenities/:id/availability" element={
          <ProtectedRoute>
            <AvailabilityPage />
          </ProtectedRoute>
        } />

        <Route path="/my-bookings" element={
          <ProtectedRoute>
            <MyBookingsPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/admin/bookings" element={
          <ProtectedRoute requireAdmin>
            <AdminBookingsPage />
          </ProtectedRoute>
        } />

        <Route path="/admin/amenities" element={
          <ProtectedRoute requireAdmin>
            <AdminAmenitiesPage />
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;