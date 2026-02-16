const KEY_COMPANIES = "tasu_companies_v1";
const KEY_SELECTED = "tasu_company_selected_v1";
const EVT_COMPANIES = "tasu_companies_changed";
const EVT_SELECTED = "tasu_company_selected_changed";

function emitCompanies() {
  window.dispatchEvent(new Event(EVT_COMPANIES));
}

function emitSelected() {
  window.dispatchEvent(new Event(EVT_SELECTED));
}

// Начальные данные (мок)
const DEFAULT_COMPANIES = [
  {
    id: "c1",
    name: "TOO Ромашка",
    bin: "123456789012",
    address: "Алматы, Абая 1",
    factAddress: "Алматы, Абая 1, офис 5",
    account: "KZ1234567890",
    bank: "Kaspi Bank",
    bik: "KZKCJ",
    kbe: "17",
    director: "Петров П.П.",
  },
  {
    id: "c2",
    name: "IP Иванов",
    bin: "987654321098",
    address: "Астана, Ленина 5",
    factAddress: "Астана, Ленина 5",
    account: "KZ0987654321",
    bank: "Halyk Bank",
    bik: "HLKBKZ",
    kbe: "19",
  },
];

export function getCompanies() {
  try {
    const raw = localStorage.getItem(KEY_COMPANIES);
    if (!raw) {
      // Инициализация
      localStorage.setItem(KEY_COMPANIES, JSON.stringify(DEFAULT_COMPANIES));
      return DEFAULT_COMPANIES;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setCompanies(list) {
  localStorage.setItem(KEY_COMPANIES, JSON.stringify(list));
  emitCompanies();
}

export function addCompany(company) {
  const list = getCompanies();
  const next = [...list, company];
  setCompanies(next);
  return company;
}

export function updateCompany(id, patch) {
  const list = getCompanies();
  const next = list.map((c) => (c.id === id ? { ...c, ...patch } : c));
  setCompanies(next);
  return next.find((c) => c.id === id);
}

export function deleteCompany(id) {
  const list = getCompanies();
  const next = list.filter((c) => c.id !== id);
  setCompanies(next);
  
  // Если удалили выбранную, сбрасываем
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
  return getCompanies().find((c) => c.id === id) || null;
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
  window.addEventListener("storage", handler); // для синхронизации между вкладками
  return () => {
    window.removeEventListener(EVT_COMPANIES, handler);
    window.removeEventListener("storage", handler);
  };
}

export function subscribeSelectedCompany(cb) {
  const handler = () => cb(getSelectedCompany());
  window.addEventListener(EVT_SELECTED, handler);
  window.addEventListener("storage", handler);
  // Так же слушаем изменение списка компаний, вдруг выбранная изменилась/удалена
  const listHandler = () => cb(getSelectedCompany());
  window.addEventListener(EVT_COMPANIES, listHandler);

  return () => {
    window.removeEventListener(EVT_SELECTED, handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVT_COMPANIES, listHandler);
  };
}
