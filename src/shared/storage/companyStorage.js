const KEY_COMPANIES = "tasu_companies_v2";
const KEY_SELECTED = "tasu_company_selected_v2";
const EVT_COMPANIES = "tasu_companies_changed";
const EVT_SELECTED = "tasu_company_selected_changed";

function emitCompanies() {
  window.dispatchEvent(new Event(EVT_COMPANIES));
}

function emitSelected() {
  window.dispatchEvent(new Event(EVT_SELECTED));
}

// Начальные данные (настоящие компании TASU)
const DEFAULT_COMPANIES = [
  {
    id: "tasu_kaz",
    name: 'ТОО "TASU KAZAKHSTAN"',
    bin: "240140034889",
    address: "Талгарский район, Бесагаш, ул. Латиф Хамиди, дом 64А",
    factAddress: "Талгарский район, Бесагаш, ул. Латиф Хамиди, дом 64А",
    account: "KZ15722S000034046863",
    bank: 'АО "Kaspi Bank"',
    bik: "CASPKZKA",
    kbe: "17",
    director: "Төлеубек А.Т.",
    phone: "+7 701 123 4567",
    email: "info@tasu.kz"
  },
  {
    id: "aldiyar",
    name: "ИП Алдияр",
    bin: "860702400843",
    address: "г. Алматы, ул. Закарпатская, дом 42",
    factAddress: "г. Алматы, ул. Закарпатская, дом 42",
    account: "KZ60722S000016847953",
    bank: 'АО "Kaspi Bank"',
    bik: "CASPKZKA",
    kbe: "19",
    director: "Мынбаев А.М.",
    phone: "+7 702 987 6543",
    email: "aldiyar@tasu.kz"
  },
  {
    id: "tasu_kz",
    name: "ИП TASU KZ",
    bin: "600507400276",
    address: "Талгарский район, Бесагаш, ул. Латиф Хамиди, дом 64А",
    factAddress: "Талгарский район, Бесагаш, ул. Латиф Хамиди, дом 64А",
    account: "KZ95722S000037232940",
    bank: 'АО "Kaspi Bank"',
    bik: "CASPKZKA",
    kbe: "19",
    director: "Төлеубек А.",
    phone: "+7 707 555 4433",
    email: "tasukz@tasu.kz"
  }
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
