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

import { useEffect } from "react";
import { loadCompanies } from "../shared/storage/companyStorage.js";
import { loadActs } from "../shared/storage/actsStorage.js";
import { loadContracts } from "../shared/storage/contractsStorage.js";

import { AuthProvider } from "../shared/auth/AuthContext";
import LoginPage from "../pages/auth/LoginPage.jsx";

import { RequireAuth } from "../shared/auth/RequireAuth.jsx";

import AdminStatsPage from "../pages/admin/AdminStatsPage.jsx";
import UsersPage from "../pages/admin/UsersPage.jsx";

export default function App() {
  useEffect(() => {
    const initData = async () => {
      await loadCompanies();
      await loadActs();
      await loadContracts();
    };
    initData();
  }, []);

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<Navigate to="/acts" replace />} />
          <Route path="/acts" element={<ActsListPage />} />
          <Route path="/acts/new" element={<ActCreatePage />} />
          <Route path="/acts/:id/edit" element={<ActCreatePage />} />
          <Route path="/acts/:id" element={<ActDetailsPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/requests/:id" element={<ActDetailsPage />} />
          <Route path="/smr" element={<SmrPage />} />
          <Route path="/smr/:id" element={<ActDetailsPage />} />
          <Route path="/warehouse" element={<WarehousePage />} />
          <Route path="/warehouse/:id" element={<ActDetailsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/new" element={<ContractCreatePage />} />
          <Route path="/contracts/:id" element={<ContractDetailsPage />} />
          
          {/* Admin only routes */}
          <Route path="/companies" element={<RequireAuth adminOnly><CompaniesPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth adminOnly><AdminStatsPage /></RequireAuth>} />
          <Route path="/admin/users" element={<RequireAuth adminOnly><UsersPage /></RequireAuth>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}