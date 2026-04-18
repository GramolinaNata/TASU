import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import CompanySelector from "../shared/ui/CompanySelector.jsx";
import { getSelectedCompanyId, getSelectedCompany, subscribeSelectedCompany } from "../shared/storage/companyStorage.js";
import { useAuth } from "../shared/auth/AuthContext";
import { api } from "../shared/api/api.js";

export default function Layout() {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('tasu_theme') || 'light');
  const { user, logout, isAdmin, isAccountant, isAccountant2, isCourier } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(getSelectedCompany());
  const location = useLocation();

  const isAnyAccountant = isAccountant || isAccountant2;

  useEffect(() => {
    if (!getSelectedCompanyId() && !isCourier && !isAnyAccountant) {
      setSelectorOpen(true);
    }
  }, [isCourier, isAnyAccountant]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tasu_theme', theme);
  }, [theme]);

  useEffect(() => {
    return subscribeSelectedCompany((c) => setSelectedCompany(c));
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const currentCompanyId = getSelectedCompanyId();
      const list = await api.requests.list();
      if (Array.isArray(list)) {
        const allNotifs = (isAnyAccountant || isAdmin) ? list : list.filter(a => a.companyId === currentCompanyId);
        const mapped = allNotifs.map(a => {
           let details = {};
           if (a.details) { try { details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details; } catch(e){} }
           let type = "", text = "", isNew = false;
           const isReady = !!a.readyForAccountant || !!details.readyForAccountant;
           const isViewedAcc = !!a.isViewedByAccountant || !!details.isViewedByAccountant;
           const isUpdatedAcc = !!a.updatedByAccountant || !!details.updatedByAccountant;
           const isViewedMan = !!a.isViewedByManager || !!details.isViewedByManager;
           if (isReady && (isAnyAccountant || isAdmin)) {
             type = "to_accountant";
             text = `📝 Заявка №${a.docNumber || a.number} от менеджера`;
             isNew = !isViewedAcc;
           } else if (isUpdatedAcc && (!isAnyAccountant || isAdmin)) {
             type = "to_manager";
             text = `✅ Обновление в №${a.docNumber || a.number}`;
             isNew = !isViewedMan;
           }
           if (!text) return null;
           return { id: a.id, text, type, isNew, date: a.updatedAt || a.createdAt, link: type === "to_accountant" ? `/accountant/acts/${a.id}` : `/sent/${a.id}` };
        }).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
        setNotifications(mapped.slice(0, 10));
        setNotifCount(mapped.filter(n => n.isNew).length);
      }
    } catch (e) {
      console.error("Fetch notifs error", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 60000);
      return () => clearInterval(interval);
    }
  }, [user, isAnyAccountant, isAdmin, location.pathname, selectedCompany?.id]);

  const getRoleName = (role) => {
    if (role === 'ADMIN') return 'Администратор';
    if (role === 'ACCOUNTANT') return 'Бухгалтер';
    if (role === 'ACCOUNTANT2') return 'Бухгалтер 2';
    if (role === 'COURIER') return 'Курьер';
    return 'Менеджер';
  };

  return (
    <main className="main">
      {!isCourier && <CompanySelector open={selectorOpen} onClose={() => setSelectorOpen(false)} />}

      <div className="container">
        <div className="main_wrapper">
          {!isCourier && (
            <aside className={`sidebar ${!isSidebarOpen ? 'sidebar--collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="sidebar_logo" onClick={() => !isAnyAccountant && setSelectorOpen(true)} style={{ cursor: isAnyAccountant ? "default" : "pointer", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
                {!isSidebarOpen ? (
                  <div style={{fontWeight: 900, fontSize: 22, color: 'var(--accent)', width: '100%', textAlign: 'center'}}>
                    {selectedCompany?.name ? selectedCompany.name.charAt(0).toUpperCase() : 'T'}
                  </div>
                ) : (
                  <img src={selectedCompany?.logo || "https://tasu-test.vercel.app/images/logo.svg"} alt="logo" style={{ maxHeight: '42px', maxWidth: '160px', objectFit: 'contain' }} />
                )}
                <button onClick={(e) => { e.stopPropagation(); toggleSidebar(); }} className="sidebar_toggle_btn" title={isSidebarOpen ? "Свернуть меню" : "Развернуть меню"}>
                  {isSidebarOpen ? '◀' : '▶'}
                </button>
              </div>

              <nav className="sidebar_menu" aria-label="Меню" style={{ flex: 1 }}>
                {(!isAnyAccountant || isAdmin) && (
                  <>
                    <NavLink to="/acts" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Заявки">
                      <span className="menu_icon">📄</span>
                      <span className="menu_text">Заявки</span>
                    </NavLink>
                    <NavLink to="/smr" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="СМР">
                      <span className="menu_icon">🚛</span>
                      <span className="menu_text">СМР</span>
                    </NavLink>
                    <NavLink to="/requests" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="ТТН">
                      <span className="menu_icon">📝</span>
                      <span className="menu_text">ТТН</span>
                    </NavLink>
                    <NavLink to="/warehouse" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Склад">
                      <span className="menu_icon">🏠</span>
                      <span className="menu_text">Склад</span>
                    </NavLink>
                    <NavLink to="/contracts" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Договоры">
                      <span className="menu_icon">🤝</span>
                      <span className="menu_text">Договоры</span>
                    </NavLink>
                    <NavLink to="/counterparties" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Контрагенты">
                      <span className="menu_icon">👥</span>
                      <span className="menu_text">Контрагенты</span>
                    </NavLink>
                    <NavLink to="/deferred" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Отложенные">
                      <span className="menu_icon">⏳</span>
                      <span className="menu_text">Отложенные</span>
                    </NavLink>
                    <NavLink to="/sent" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Отработанные">
                      <span className="menu_icon">✅</span>
                      <span className="menu_text">Отработанные</span>
                    </NavLink>
                    <NavLink to="/simple" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Частные лица">
  <span className="menu_icon">📋</span>
  <span className="menu_text">Частные лица</span>
</NavLink>
                  </>
                )}

                {isAnyAccountant && (
                  <div className="accountant_section" style={{ paddingBottom: '10px' }}>
                    <div className="menu_section_title" style={{ padding: '4px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {isSidebarOpen ? 'Бухгалтерия' : '...'}
                    </div>
                    <NavLink to="/accountant/general" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Все заявки">
                      <span className="menu_icon">🗂️</span>
                      <span className="menu_text" style={{ position: 'relative' }}>
                        Все заявки
                        {notifCount > 0 && (
                          <span className="nav_badge animate_pulse">{notifCount}</span>
                        )}
                      </span>
                    </NavLink>
                    {isAccountant && (
                      <NavLink to="/accountant/expenses" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Расходы">
                        <span className="menu_icon">💸</span>
                        <span className="menu_text">Расходы</span>
                      </NavLink>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <div className="admin_section" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    <div className="menu_section_title" style={{ padding: '4px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {isSidebarOpen ? 'Админка' : '...'}
                    </div>
                    <NavLink to="/admin" end className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Аналитика">
                      <span className="menu_icon">📊</span>
                      <span className="menu_text">Аналитика</span>
                    </NavLink>
                    <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Персонал">
                      <span className="menu_icon">👥</span>
                      <span className="menu_text">Персонал</span>
                    </NavLink>
                    <NavLink to="/companies" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Компании">
                      <span className="menu_icon">🏢</span>
                      <span className="menu_text">Компании</span>
                    </NavLink>
                    <NavLink to="/admin/tariffs" className={({ isActive }) => (isActive ? "selected_menu" : "")} title="Тарифы">
  <span className="menu_icon">💰</span>
  <span className="menu_text">Тарифы</span>
</NavLink>
                  </div>
                )}
              </nav>

              {user && (
                <div className="sidebar_user" style={{ padding: isSidebarOpen ? '1rem' : '1rem 0', borderTop: '1px solid var(--border-color)', marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: isSidebarOpen ? 'flex-start' : 'center' }}>
                  {isSidebarOpen ? (
                    <>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {getRoleName(user.role)}
                      </div>
                    </>
                  ) : (
                    <div title={user.name} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '10px' }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button onClick={logout} className="btn" title="Выйти" style={{ padding: isSidebarOpen ? '4px 8px' : '4px 0', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', width: '100%' }}>
                    {isSidebarOpen ? 'Выйти' : '🚪'}
                  </button>
                </div>
              )}
            </aside>
          )}

          <section className="content" style={{ maxWidth: isCourier ? '100%' : (isSidebarOpen ? 'calc(100% - 280px)' : 'calc(100% - 80px)'), padding: 0 }}>
            {!isCourier ? (
              <div className="content_header" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '10px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ position: 'relative' }}>
                    <button className="btn--notif" onClick={() => setShowNotifMenu(!showNotifMenu)} title="Уведомления">
                      <span style={{ fontSize: '1.2rem' }}>🔔</span>
                      {notifCount > 0 && <span className="nav_badge_top">{notifCount}</span>}
                    </button>
                    {showNotifMenu && (
                      <div className="notif_dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="notif_header">Уведомления</div>
                        <div className="notif_list">
                          {notifications.length === 0 ? (
                            <div className="notif_empty">
                              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
                              <div>У вас нет новых уведомлений</div>
                            </div>
                          ) : (
                            notifications.map(n => (
                              <NavLink key={n.id} to={n.link} className={`notif_item ${n.isNew ? 'notif_item--new' : ''}`} onClick={() => setShowNotifMenu(false)}>
                                <div className="notif_dot_container">{n.isNew && <span className="notif_dot" />}</div>
                                <div style={{ flex: 1 }}>
                                  <div className="notif_text" style={{ opacity: n.isNew ? 1 : 0.6 }}>{n.text}</div>
                                  <div className="notif_date">{new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                              </NavLink>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {getRoleName(user?.role)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="content_header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border-color)', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Курьер</div>
                  </div>
                  <button onClick={logout} className="btn btn--ghost" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>Выйти</button>
                </div>
              </div>
            )}
            <div className="content_wrapper">
              <Outlet context={{ openCompanySelector: () => setSelectorOpen(true) }} />
            </div>
          </section>
        </div>
      </div>

      <button className="theme_toggle_btn" onClick={toggleTheme} title="Переключить тему">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <style>{`
        .nav_badge {
           display: inline-flex; align-items: center; justify-content: center;
           background: #ef4444; color: #fff; font-size: 10px; font-weight: 700;
           width: 18px; height: 18px; border-radius: 50%; position: absolute;
           right: -24px; top: 0px; box-shadow: 0 0 0 2px var(--card);
        }
        .animate_pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
           0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
           70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
           100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </main>
  );
}