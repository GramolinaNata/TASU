import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import CompanySelector from "../shared/ui/CompanySelector.jsx";
import { getSelectedCompanyId } from "../shared/storage/companyStorage.js";

export default function Layout() {
  const [selectorOpen, setSelectorOpen] = useState(false);

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
          <aside className="sidebar">
            <div className="sidebar_logo" onClick={() => setSelectorOpen(true)} style={{ cursor: "pointer" }}>
              <img src="https://tasu-test.vercel.app/images/logo.svg" alt="logo" />
            </div>

            <nav className="sidebar_menu" aria-label="Меню">
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

              <a href="#!" className="not-implemented">
                Склад
              </a>

              <a href="#!">Договоры</a>

              <NavLink
                to="/companies"
                className={({ isActive }) => (isActive ? "selected_menu" : "")}
              >
                Компании
              </NavLink>
            </nav>
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
