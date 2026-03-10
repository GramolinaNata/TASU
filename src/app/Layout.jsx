import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import CompanySelector from "../shared/ui/CompanySelector.jsx";
import { getSelectedCompanyId } from "../shared/storage/companyStorage.js";
import { useAuth } from "../shared/auth/AuthContext";

export default function Layout() {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();

  useEffect(() => {
    if (!getSelectedCompanyId()) {
      setSelectorOpen(true);
    }
  }, []);

  return (
    <main className="main">
      <CompanySelector open={selectorOpen} onClose={() => setSelectorOpen(false)} />

      <div className="container">
        <div className="main_wrapper">
          <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar_logo" onClick={() => setSelectorOpen(true)} style={{ cursor: "pointer" }}>
              <img src="https://tasu-test.vercel.app/images/logo.svg" alt="logo" />
            </div>

            <nav className="sidebar_menu" aria-label="Меню" style={{ flex: 1 }}>
              <NavLink to="/acts" className={({ isActive }) => (isActive ? "selected_menu" : "")}>
                Заявки
              </NavLink>

              <NavLink to="/smr" className={({ isActive }) => (isActive ? "selected_menu" : "")}>
                СМР
              </NavLink>

              <NavLink
                to="/requests"
                className={({ isActive }) => (isActive ? "selected_menu" : "")}
              >
                ТТН
              </NavLink>

              <NavLink
                to="/warehouse"
                className={({ isActive }) => (isActive ? "selected_menu" : "")}
              >
                Склад
              </NavLink>

              <NavLink
                to="/contracts"
                className={({ isActive }) => (isActive ? "selected_menu" : "")}
              >
                Договоры
              </NavLink>


              {isAdmin && (
                <div className="admin_section" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <div style={{ padding: '4px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Админка</div>
                  <NavLink
                    to="/admin"
                    end
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                  >
                    Статистика
                  </NavLink>
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                  >
                    Персонал
                  </NavLink>
                  <NavLink
                    to="/companies"
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                  >
                    Компании
                  </NavLink>
                </div>
              )}
            </nav>

            {user && (
              <div className="sidebar_user" style={{ 
                padding: '1rem', 
                borderTop: '1px solid var(--border-color)',
                marginTop: 'auto'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{user.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {user.role === 'ADMIN' ? 'Администратор' : 'Менеджер'}
                </div>
                <button 
                  onClick={logout} 
                  className="btn" 
                  style={{ 
                    padding: '4px 8px', 
                    fontSize: '0.8rem', 
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    width: '100%'
                  }}
                >
                  Выйти
                </button>
              </div>
            )}
          </aside>

          <section className="content">
            <div className="content_wrapper">
              <Outlet context={{ openCompanySelector: () => setSelectorOpen(true) }} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

