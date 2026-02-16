import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout.jsx";
import ActsListPage from "../pages/acts/ActsListPage.jsx";
import ActCreatePage from "../pages/acts/ActCreatePage.jsx";
import ActDetailsPage from "../pages/acts/ActDetailsPage.jsx";
import RequestsPage from "../pages/requests/RequestsPage.jsx";
import SmrPage from "../pages/smr/SmrPage.jsx";
import CompaniesPage from "../pages/companies/CompaniesPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/acts" replace />} />
        <Route path="/acts" element={<ActsListPage />} />
        <Route path="/acts/new" element={<ActCreatePage />} />
        <Route path="/acts/:id/edit" element={<ActCreatePage />} />
        <Route path="/acts/:id" element={<ActDetailsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/smr" element={<SmrPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
      </Route>
    </Routes>
  );
}
