import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, roles, permission }) {
  const { user, loading, isSuperAdmin, isMerchant, isDriver } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles) {
    const allowed = roles.some((role) => {
      if (role === 'super_admin') return isSuperAdmin;
      if (role === 'admin') return isSuperAdmin;
      if (role === 'merchant') return isMerchant;
      if (role === 'driver') return isDriver;
      return user.role === role;
    });
    if (!allowed) return <Navigate to="/" replace />;
  }

  if (permission === 'canSell' && !isMerchant) {
    return <Navigate to="/" replace />;
  }

  if (permission === 'canDeliver' && !isDriver) {
    return <Navigate to="/" replace />;
  }

  return children;
}
