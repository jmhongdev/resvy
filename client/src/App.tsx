import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AmenitiesPage from './pages/AmenitiesPage';
import AvailabilityPage from './pages/AvailabilityPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const { user } = useAuth();

  return (
    <>
      {/* Only show navbar when logged in */}
      {user && <Navbar />}

      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes — require login */}
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

        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        {/* Catch all — redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;