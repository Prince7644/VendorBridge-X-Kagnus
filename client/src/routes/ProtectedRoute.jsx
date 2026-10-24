import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ permission, children }) {
  const { user, loading, can, sessionExpired } = useAuth();
  const location = useLocation();

  if (loading) return <div className="vb-fullpage"><Loader label="Loading VendorBridge" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location, expired: sessionExpired }} />;
  if (permission && !can(permission)) {
    return (
      <EmptyState icon={ShieldAlert} title="You do not have access to this page">
        Your role does not include this area. Ask an administrator if you think this is a mistake.
      </EmptyState>
    );
  }
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="vb-fullpage"><Loader label="Loading VendorBridge" /></div>;
  return user ? <Navigate to={location.state?.from?.pathname || '/'} replace /> : children;
}
