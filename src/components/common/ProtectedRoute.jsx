import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ allowedRole, children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const redirect = user.role === 'brand' ? '/brand/overview' : '/influencer/overview';
    return <Navigate to={redirect} replace />;
  }

  return children;
};

export default ProtectedRoute;
