import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children, adminOnly = false, accountantOnly = false, accountantOrAdminOnly = false, managerOrAdminOnly = false }) {
  const { user, loading, isAdmin, isAccountant } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (accountantOnly && !isAccountant) {
    return <Navigate to="/" replace />;
  }

  if (accountantOrAdminOnly && !isAdmin && !isAccountant) {
    return <Navigate to="/" replace />;
  }

  if (managerOrAdminOnly && !isAdmin && isAccountant) {
    return <Navigate to="/" replace />;
  }

  return children;
}
