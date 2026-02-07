import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <main className="main">
      <div className="container">
        <div className="main_wrapper">
          <aside className="sidebar">
            <div className="sidebar_logo">
              <img src="https://tasu-test.vercel.app/images/logo.svg" alt="logo" />
            </div>

            <nav className="sidebar_menu" aria-label="Меню">
              <NavLink to="/acts" className={({ isActive }) => (isActive ? "selected_menu" : "")}>
                Акты
              </NavLink>

              <NavLink to="/smr" className={({ isActive }) => (isActive ? "selected_menu" : "")}>
                СМР
              </NavLink>

              <NavLink
                to="/requests"
                className={({ isActive }) => (isActive ? "selected_menu" : "")}
              >
                Заявки ТТН
              </NavLink>

              <a href="#!">Договоры</a>
            </nav>
          </aside>

          <section className="content">
            <div className="content_wrapper">
              <Outlet />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
