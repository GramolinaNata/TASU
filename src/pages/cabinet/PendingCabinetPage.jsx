import React from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { roleName } from "../../shared/auth/roles.js";

/**
 * Заглушка кабинета для ролей, экраны которых ещё не написаны
 * (кладовщик, местный и региональный курьер, операционный менеджер).
 *
 * ЗАЧЕМ ОНА ВООБЩЕ НУЖНА. Маршруты /acts, /simple, /counterparties гейта не
 * имеют — их видит любой авторизованный, а стартовая страница для роли, не
 * попавшей ни в одну ветку App.jsx, падает в <Navigate to="/acts">. То есть
 * новая роль, заведённая только в справочнике, молча получила бы полный
 * интерфейс менеджера вместе с суммами. Пока кабинета нет, роль обязана
 * упираться в эту страницу, а не в чужие данные.
 *
 * Страница появится и исчезнет сама: как только у роли будет cabinet:true
 * в ROLE_META, она перестаёт попадать в PENDING_CABINET_ROLES и сюда больше
 * не заворачивается.
 */
export default function PendingCabinetPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px 16px" }}>
      <div className="card" style={{ maxWidth: 520, width: "100%", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 16 }}>🚧</div>

        <h1 style={{ margin: "0 0 8px", fontSize: "1.35rem" }}>Кабинет в разработке</h1>

        <div style={{ marginBottom: 20 }}>
          <span
            style={{
              display: "inline-block", padding: "4px 12px", borderRadius: 999,
              background: "#eef2ff", color: "#3730a3", fontWeight: 700, fontSize: "0.85rem",
            }}
          >
            {roleName(user?.role)}
          </span>
        </div>

        <p className="muted" style={{ fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 24px" }}>
          Учётная запись создана и вход работает, но рабочие экраны для этой роли
          ещё не готовы. Доступ к разделам менеджера намеренно закрыт — до готовности
          кабинета роль не должна видеть чужие заявки и суммы.
        </p>

        <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 24 }}>
          {user?.name ? `${user.name} · ` : ""}{user?.email || ""}
          {user?.city ? ` · город: ${user.city}` : ""}
        </div>

        <button className="btn" onClick={logout} style={{ width: "100%" }}>
          Выйти
        </button>
      </div>
    </div>
  );
}
