import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import CompanySelector from "../shared/ui/CompanySelector.jsx";
import { getSelectedCompanyId } from "../shared/storage/companyStorage.js";
import { useAuth } from "../shared/auth/AuthContext";

export default function Layout() {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('tasu_theme') || 'light');
  const { user, logout, isAdmin, isAccountant } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!getSelectedCompanyId()) {
      setSelectorOpen(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tasu_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  }

  return (
    <main className="main">
      <CompanySelector open={selectorOpen} onClose={() => setSelectorOpen(false)} />

      <div className="container">
        <div className="main_wrapper">
          <aside className={`sidebar ${!isSidebarOpen ? 'sidebar--collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar_logo" onClick={() => setSelectorOpen(true)} style={{ cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {!isSidebarOpen ? (
                 <div style={{fontWeight: 900, fontSize: 18, color: 'var(--accent)', marginLeft: 4}}>T</div>
              ) : (
                 <img src="https://tasu-test.vercel.app/images/logo.svg" alt="logo" />
              )}
               <button 
                  onClick={(e) => { e.stopPropagation(); toggleSidebar(); }} 
                  className="sidebar_toggle_btn"
                  title={isSidebarOpen ? "Свернуть меню" : "Развернуть меню"}
               >
                 {isSidebarOpen ? '◀' : '▶'}
               </button>
            </div>

            <nav className="sidebar_menu" aria-label="Меню" style={{ flex: 1 }}>
              {(!isAccountant || isAdmin) && (
                <>
                  <NavLink to="/acts" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Заявки">
                    <span className="menu_icon">📄</span>
                    <span className="menu_text">Заявки</span>
                  </NavLink>

                  <NavLink to="/smr" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="СМР">
                    <span className="menu_icon">🚛</span>
                    <span className="menu_text">СМР</span>
                  </NavLink>

                  <NavLink
                    to="/requests"
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                    title="ТТН"
                  >
                    <span className="menu_icon">📝</span>
                    <span className="menu_text">ТТН</span>
                  </NavLink>

                  <NavLink
                    to="/warehouse"
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                    title="Склад"
                  >
                    <span className="menu_icon">🏭</span>
                    <span className="menu_text">Склад</span>
                  </NavLink>

                  <NavLink
                    to="/contracts"
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                    title="Договоры"
                  >
                    <span className="menu_icon">🤝</span>
                    <span className="menu_text">Договоры</span>
                  </NavLink>

                  {!isAccountant || isAdmin ? (
                    <NavLink
                      to="/deferred"
                      className={({ isActive }) => (isActive ? "selected_menu" : "")}
                      title="Отложенные заявки"
                    >
                      <span className="menu_icon">⏳</span>
                      <span className="menu_text">Отложенные</span>
                    </NavLink>
                  ) : null}

                  {!isAccountant || isAdmin ? (
                    <NavLink
                      to="/sent"
                      className={({ isActive }) => (isActive ? "selected_menu" : "")}
                      title="Отработанные заявки"
                    >
                      <span className="menu_icon">✅</span>
                      <span className="menu_text">Отработанные</span>
                    </NavLink>
                  ) : null}
                </>
              )}

              {(isAdmin || isAccountant) && (
                <div className="accountant_section" style={{  paddingBottom: '10px' }}>
                  <div className="menu_section_title" style={{ padding: '4px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {isSidebarOpen ? 'Бухгалтерия' : '...'}
                  </div>
                  <NavLink
                    to="/accountant/general"
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                    title="Все заявки"
                  >
                    <span className="menu_icon">🗂️</span>
                    <span className="menu_text">Все заявки</span>
                  </NavLink>
                </div>
              )}


              {isAdmin && (
                <div className="admin_section" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <div className="menu_section_title" style={{ padding: '4px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {isSidebarOpen ? 'Админка' : '...'}
                  </div>
                  <NavLink
                    to="/admin"
                    end
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                    title="Аналитика"
                  >
                    <span className="menu_icon">📊</span>
                    <span className="menu_text">Аналитика</span>
                  </NavLink>
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                    title="Персонал"
                  >
                    <span className="menu_icon">👥</span>
                    <span className="menu_text">Персонал</span>
                  </NavLink>
                  <NavLink
                    to="/companies"
                    className={({ isActive }) => (isActive ? "selected_menu" : "")}
                    title="Компании"
                  >
                    <span className="menu_icon">🏢</span>
                    <span className="menu_text">Компании</span>
                  </NavLink>
                </div>
              )}
            </nav>

            {user && (
              <div className="sidebar_user" style={{ 
                padding: isSidebarOpen ? '1rem' : '1rem 0', 
                borderTop: '1px solid var(--border-color)',
                marginTop: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isSidebarOpen ? 'flex-start' : 'center'
              }}>
                {isSidebarOpen ? (
                  <>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {user.role === 'ADMIN' ? 'Админ' : user.role === 'ACCOUNTANT' ? 'Бухгалтер' : 'Менеджер'}
                    </div>
                  </>
                ) : (
                  <div title={user.name} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '10px' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <button 
                  onClick={logout} 
                  className="btn" 
                  title="Выйти"
                  style={{ 
                    padding: isSidebarOpen ? '4px 8px' : '4px 0', 
                    fontSize: '0.8rem', 
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    width: '100%'
                  }}
                >
                  {isSidebarOpen ? 'Выйти' : '🚪'}
                </button>
              </div>
            )}
          </aside>

          <section className="content" style={{ maxWidth: isSidebarOpen ? 'calc(100% - 280px)' : 'calc(100% - 80px)' }}>
            <div className="content_wrapper">
              <Outlet context={{ openCompanySelector: () => setSelectorOpen(true) }} />
            </div>
          </section>
        </div>
      </div>

      <button className="theme_toggle_btn" onClick={toggleTheme} title="Переключить тему">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </main>
  );
}

