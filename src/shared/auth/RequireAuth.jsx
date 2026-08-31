import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { needsPendingCabinet, PENDING_CABINET_PATH, isPathAllowedForRole, roleHome } from "./roles.js";

export function RequireAuth({ children, adminOnly = false, accountantOnly = false, accountant1Only = false, accountant2Only = false, accountantOrAdminOnly = false, managerOrAdminOnly = false, courierOnly = false, allowPendingCabinet = false }) {
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

  // РОЛИ БЕЗ ГОТОВОГО КАБИНЕТА — единственная новая ветка в этом файле.
  //
  // Срабатывает ТОЛЬКО для четырёх новых строк ролей (WAREHOUSE_KEEPER,
  // COURIER_LOCAL, COURIER_REGION, OPS_MANAGER): needsPendingCabinet проверяет
  // вхождение в этот набор, поэтому на семь существующих ролей ветка не влияет
  // по построению — им она всегда отдаёт false (см. roles.test.mjs).
  //
  // Почему ветка обязана быть ПЕРВОЙ и почему она вообще нужна: /acts, /simple
  // и другие маршруты гейта не имеют вовсе, а стартовая страница для роли, не
  // попавшей ни в одну ветку App.jsx, ведёт на /acts. Без этой проверки
  // кладовщик получил бы полный интерфейс менеджера с суммами.
  // Сверка с текущим путём — страховка от петли редиректов на случай, если
  // маршрут заглушки когда-нибудь переедет внутрь группы с общим RequireAuth.
  if (
    !allowPendingCabinet &&
    location.pathname !== PENDING_CABINET_PATH &&
    needsPendingCabinet(user?.role)
  ) {
    return <Navigate to={PENDING_CABINET_PATH} replace />;
  }

  // ЗАПЕРТЫЕ РОЛИ — вторая новая ветка, и по той же причине, что первая.
  //
  // У кладовщика и курьеров теперь есть свой кабинет, значит заворот на
  // заглушку выключился. Но /acts, /simple и прочее гейта не имеют вовсе:
  // без этой проверки роль ушла бы в интерфейс менеджера вместе с суммами.
  // Доступ у них устроен наоборот: разрешён свой кабинет и /scan, всё
  // остальное уводит домой. isPathAllowedForRole для семи существующих
  // ролей всегда возвращает true — их эта ветка не касается.
  if (!isPathAllowedForRole(user?.role, location.pathname)) {
    return <Navigate to={roleHome(user?.role)} replace />;
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