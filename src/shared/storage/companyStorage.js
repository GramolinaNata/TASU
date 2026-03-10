import { api } from "../api/api";

const KEY_SELECTED = "tasu_company_selected_v2";
const EVT_COMPANIES = "tasu_companies_changed";
const EVT_SELECTED = "tasu_company_selected_changed";

let companiesCache = [];

function emitCompanies() {
  window.dispatchEvent(new Event(EVT_COMPANIES));
}

function emitSelected() {
  window.dispatchEvent(new Event(EVT_SELECTED));
}

export async function loadCompanies() {
  try {
    const list = await api.companies.list();
    companiesCache = list;
    emitCompanies();
    return list;
  } catch (err) {
    console.error("Failed to load companies:", err);
    return companiesCache;
  }
}

export function getCompanies() {
  return companiesCache;
}

export async function addCompany(companyData) {
  const newCompany = await api.companies.create(companyData);
  await loadCompanies();
  return newCompany;
}

export async function updateCompany(id, patch) {
  const updated = await api.companies.update(id, patch);
  await loadCompanies();
  return updated;
}

export async function deleteCompany(id) {
  await api.companies.delete(id);
  await loadCompanies();
  
  if (getSelectedCompanyId() === id) {
    setSelectedCompanyId(null);
  }
}

export function getSelectedCompanyId() {
  return localStorage.getItem(KEY_SELECTED);
}

export function getSelectedCompany() {
  const id = getSelectedCompanyId();
  if (!id) return null;
  return companiesCache.find((c) => c.id === id) || null;
}

export function setSelectedCompanyId(id) {
  if (id) {
    localStorage.setItem(KEY_SELECTED, id);
  } else {
    localStorage.removeItem(KEY_SELECTED);
  }
  emitSelected();
}

export function subscribeCompanies(cb) {
  const handler = () => cb(getCompanies());
  window.addEventListener(EVT_COMPANIES, handler);
  return () => {
    window.removeEventListener(EVT_COMPANIES, handler);
  };
}

export function subscribeSelectedCompany(cb) {
  const handler = () => cb(getSelectedCompany());
  window.addEventListener(EVT_SELECTED, handler);
  const listHandler = () => cb(getSelectedCompany());
  window.addEventListener(EVT_COMPANIES, listHandler);

  return () => {
    window.removeEventListener(EVT_SELECTED, handler);
    window.removeEventListener(EVT_COMPANIES, listHandler);
  };
}

