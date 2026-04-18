import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout.jsx";
import ActsListPage from "../pages/acts/ActsListPage.jsx";
import ActCreatePage from "../pages/acts/ActCreatePage.jsx";
import ActDetailsPage from "../pages/acts/ActDetailsPage.jsx";
import RequestsPage from "../pages/requests/RequestsPage.jsx";
import SmrPage from "../pages/smr/SMRPage.jsx";
import CompaniesPage from "../pages/companies/CompaniesPage.jsx";
import WarehousePage from "../pages/acts/WarehousePage.jsx";
import ContractsPage from "../pages/contracts/ContractsPage.jsx";
import ContractCreatePage from "../pages/contracts/ContractCreatePage.jsx";
import ContractDetailsPage from "../pages/contracts/ContractDetailsPage.jsx";
import CounterpartiesPage from "../pages/companies/CounterpartiesPage.jsx";
import AccountantExpensesPage from "../pages/accountant/ExpensesPage.jsx";
import SimpleActsListPage from "../pages/simple/SimpleActsListPage.jsx";
import SimpleActPage from "../pages/simple/SimpleActPage.jsx";
import TariffsPage from "../pages/admin/TariffsPage.jsx";

import { useEffect } from "react";
import { loadCompanies } from "../shared/storage/companyStorage.js";
import { loadActs } from "../shared/storage/actsStorage.js";
import { loadContracts } from "../shared/storage/contractsStorage.js";

import { useAuth } from "../shared/auth/AuthContext";
import LoginPage from "../pages/auth/LoginPage.jsx";

import { RequireAuth } from "../shared/auth/RequireAuth.jsx";

import AdminStatsPage from "../pages/admin/AdminStatsPage.jsx";
import UsersPage from "../pages/admin/UsersPage.jsx";

import AccountantGeneralPage from "../pages/accountant/AccountantGeneralPage.jsx";
import DeferredPage from "../pages/acts/DeferredPage.jsx";
import SentToAccountantPage from "../pages/acts/SentToAccountantPage.jsx";
import CourierActViewPage from "../pages/courier/CourierActViewPage.jsx";
import CourierPage from "../pages/courier/CourierPage.jsx";

export default function App() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const initData = async () => {
      console.log("[App] User authorized, reloading global data...");
      await loadCompanies();
      await loadActs();
      await loadContracts();
    };
    initData();
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={
          user?.role === 'ACCOUNTANT' || user?.role === 'ACCOUNTANT2'
            ? <Navigate to="/accountant/general" replace />
            : user?.role === 'COURIER'
              ? <Navigate to="/courier" replace />
              : <Navigate to="/acts" replace />
        } />
        <Route path="/acts" element={<ActsListPage />} />
        <Route path="/acts/new" element={<ActCreatePage />} />
        <Route path="/acts/:id/edit" element={<ActCreatePage />} />
        <Route path="/acts/:id" element={<ActDetailsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/requests/:id/edit" element={<ActCreatePage />} />
        <Route path="/requests/:id" element={<ActDetailsPage />} />
        <Route path="/smr" element={<SmrPage />} />
        <Route path="/smr/:id/edit" element={<ActCreatePage />} />
        <Route path="/smr/:id" element={<ActDetailsPage />} />
        <Route path="/warehouse" element={<WarehousePage />} />
        <Route path="/warehouse/new" element={<ActCreatePage />} />
        <Route path="/warehouse/:id/edit" element={<ActCreatePage />} />
        <Route path="/warehouse/:id" element={<ActDetailsPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/contracts/new" element={<ContractCreatePage />} />
        <Route path="/contracts/:id" element={<ContractDetailsPage />} />
        <Route path="/sent" element={<RequireAuth managerOrAdminOnly><SentToAccountantPage /></RequireAuth>} />
        <Route path="/sent/:id" element={<RequireAuth managerOrAdminOnly><ActDetailsPage /></RequireAuth>} />
        <Route path="/companies" element={<RequireAuth adminOnly><CompaniesPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth adminOnly><AdminStatsPage /></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth adminOnly><UsersPage /></RequireAuth>} />
        <Route path="/admin/tariffs" element={<RequireAuth adminOnly><TariffsPage /></RequireAuth>} />
        <Route path="/counterparties" element={<CounterpartiesPage />} />
        <Route path="/accountant/general" element={<RequireAuth accountantOnly><AccountantGeneralPage /></RequireAuth>} />
        <Route path="/accountant/acts/:id" element={<RequireAuth accountantOnly><ActDetailsPage /></RequireAuth>} />
        <Route path="/accountant/expenses" element={<RequireAuth accountant1Only><AccountantExpensesPage /></RequireAuth>} />
        <Route path="/courier" element={<RequireAuth courierOnly><CourierPage /></RequireAuth>} />
        <Route path="/deferred" element={<RequireAuth managerOrAdminOnly><DeferredPage /></RequireAuth>} />
        <Route path="/deferred/:id" element={<RequireAuth managerOrAdminOnly><ActDetailsPage /></RequireAuth>} />
        <Route path="/deferred/:id/edit" element={<RequireAuth managerOrAdminOnly><ActCreatePage /></RequireAuth>} />
        <Route path="/simple" element={<SimpleActsListPage />} />
        <Route path="/simple/new" element={<SimpleActPage />} />
      </Route>
      <Route path="/courier/acts/:id" element={<CourierActViewPage />} />
    </Routes>
  );
}