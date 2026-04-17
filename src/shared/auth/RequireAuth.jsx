import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children, adminOnly = false, accountantOnly = false, accountant1Only = false, accountant2Only = false, accountantOrAdminOnly = false, managerOrAdminOnly = false, courierOnly = false }) {
  const { user, loading, isAdmin, isAccountant, isAccountant2, isCourier } = useAuth();
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

  if (accountant1Only && !isAccountant) {
    return <Navigate to="/" replace />;
  }

  if (accountantOnly && !isAccountant && !isAccountant2 && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (accountant2Only && !isAccountant2 && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (accountantOrAdminOnly && !isAdmin && !isAccountant && !isAccountant2) {
    return <Navigate to="/" replace />;
  }

  if (managerOrAdminOnly && !isAdmin && (isAccountant || isAccountant2)) {
    return <Navigate to="/" replace />;
  }

  if (courierOnly && !isCourier && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}