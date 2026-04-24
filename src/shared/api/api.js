// const API_URL = import.meta?.env?.VITE_API_URL || '/api';

// const getAuthHeader = () => {
//   const token = localStorage.getItem('tasu_token');
//   return token ? { 'Authorization': `Bearer ${token}` } : {};
// };

// const request = async (endpoint, options = {}) => {
//   const res = await fetch(`${API_URL}${endpoint}`, {
//     ...options,
//     headers: {
//       'Content-Type': 'application/json',
//       ...getAuthHeader(),
//       ...options.headers,
//     },
//   });
//   if (!res.ok) {
//     const errorText = await res.text().catch(() => 'Unknown Error');
//     let errorMessage = 'API Error';
//     try {
//       const errorJson = JSON.parse(errorText);
//       errorMessage = errorJson.message || errorMessage;
//     } catch (e) {
//       console.error('Failed to parse error JSON:', errorText);
//     }
//     throw new Error(errorMessage);
//   }
//   return res.json().catch(() => null);
// };

// export const api = {
//   auth: {
//     login: (email, password) => request('/auth/login', {
//       method: 'POST',
//       body: JSON.stringify({ email, password }),
//     }),
//     getMe: () => request('/auth/me'),
//   },
//   companies: {
//     list: () => request('/companies'),
//     get: (id) => request(`/companies/${id}`),
//     create: (data) => request('/companies', { method: 'POST', body: JSON.stringify(data) }),
//     update: (id, data) => request(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//     delete: (id) => request(`/companies/${id}`, { method: 'DELETE' }),
//   },
//   requests: {
//     list: (companyId) => request(`/requests${companyId ? `?companyId=${companyId}` : ''}`),
//     get: (id) => request(`/requests/${id}`),
//     create: (data) => request('/requests', { method: 'POST', body: JSON.stringify(data) }),
//     update: (id, data) => request(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//     delete: (id) => request(`/requests/${id}`, { method: 'DELETE' }),
//   },
//   users: {
//     list: () => request('/users'),
//     create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
//     update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//     delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
//   },
//   contracts: {
//     list: (companyId) => request(`/contracts${companyId ? `?companyId=${companyId}` : ''}`),
//     get: (id) => request(`/contracts/${id}`),
//     create: (data) => request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
//     update: (id, data) => request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//     delete: (id) => request(`/contracts/${id}`, { method: 'DELETE' }),
//   },
//   counterparties: {
//     list: (companyId) => request(`/counterparties${companyId ? `?companyId=${companyId}` : ''}`),
//     get: (id) => request(`/counterparties/${id}`),
//     create: (data) => request('/counterparties', { method: 'POST', body: JSON.stringify(data) }),
//     update: (id, data) => request(`/counterparties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//     delete: (id) => request(`/counterparties/${id}`, { method: 'DELETE' }),
//   },
//   expenses: {
//     list: (companyId) => request(`/expenses${companyId ? `?companyId=${companyId}` : ''}`),
//     create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
//     update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//     delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
//   },
//   tariffs: {
//     list: () => request('/tariffs'),
//     create: (data) => request('/tariffs', { method: 'POST', body: JSON.stringify(data) }),
//     update: (id, data) => request(`/tariffs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//     delete: (id) => request(`/tariffs/${id}`, { method: 'DELETE' }),
//   },
//   public: {
//     getAct: (id) => request(`/public/acts/${id}`, { headers: {} }),
//   },
//   batches: {
//     list: (companyId) => request(`/batches${companyId ? `?companyId=${companyId}` : ''}`),
//     get: (id) => request(`/batches/${id}`),
//     create: (data) => request('/batches', { method: 'POST', body: JSON.stringify(data) }),
//     update: (id, data) => request(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
//     delete: (id) => request(`/batches/${id}`, { method: 'DELETE' }),
//   },
// };


const API_URL = import.meta?.env?.VITE_API_URL || '/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('tasu_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const request = async (endpoint, options = {}) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown Error');
    let errorMessage = 'API Error';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch (e) {
      console.error('Failed to parse error JSON:', errorText);
    }
    throw new Error(errorMessage);
  }
  return res.json().catch(() => null);
};

/**
 * Собирает querystring из объекта параметров, пропуская пустые значения.
 * buildQuery({ companyId: 'abc', scope: 'active', sortBy: null })
 *   → '?companyId=abc&scope=active'
 */
const buildQuery = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `?${qs}`;
};

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    getMe: () => request('/auth/me'),
  },
  companies: {
    list: () => request('/companies'),
    get: (id) => request(`/companies/${id}`),
    create: (data) => request('/companies', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/companies/${id}`, { method: 'DELETE' }),
  },
  requests: {
    /**
     * Универсальный список с фильтрами и сортировкой.
     * Старая сигнатура тоже работает: api.requests.list('companyId123')
     * Новая: api.requests.list({ companyId, scope, status, type, sortBy, order })
     */
    list: (paramsOrCompanyId) => {
      let params = {};
      if (typeof paramsOrCompanyId === 'string') {
        params = { companyId: paramsOrCompanyId };
      } else if (typeof paramsOrCompanyId === 'object' && paramsOrCompanyId !== null) {
        params = paramsOrCompanyId;
      }
      return request(`/requests${buildQuery(params)}`);
    },
    get: (id) => request(`/requests/${id}`),
    create: (data) => request('/requests', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/requests/${id}`, { method: 'DELETE' }),

    // Новое: кнопка "Заявка отработана бухгалтером"
    completeByAccountant: (id) => request(`/requests/${id}/complete-by-accountant`, {
      method: 'POST',
    }),

    // Новое: возврат заявки из архива (обновляет дату на сегодня)
    restore: (id, targetStatus) => request(`/requests/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus }),
    }),
  },
  users: {
    /**
     * Поддержка сортировки: api.users.list({ sortBy: 'name', order: 'asc' })
     * Старый вызов api.users.list() тоже работает.
     */
    list: (params = {}) => request(`/users${buildQuery(params)}`),
    create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  },
  contracts: {
    list: (companyId) => request(`/contracts${companyId ? `?companyId=${companyId}` : ''}`),
    get: (id) => request(`/contracts/${id}`),
    create: (data) => request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/contracts/${id}`, { method: 'DELETE' }),
  },
  counterparties: {
    list: (companyId) => request(`/counterparties${companyId ? `?companyId=${companyId}` : ''}`),
    get: (id) => request(`/counterparties/${id}`),
    create: (data) => request('/counterparties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/counterparties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/counterparties/${id}`, { method: 'DELETE' }),
  },
  expenses: {
    list: (companyId) => request(`/expenses${companyId ? `?companyId=${companyId}` : ''}`),
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },
  tariffs: {
    list: () => request('/tariffs'),
    create: (data) => request('/tariffs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/tariffs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/tariffs/${id}`, { method: 'DELETE' }),
  },
  public: {
    getAct: (id) => request(`/public/acts/${id}`, { headers: {} }),
  },
  batches: {
    list: (companyId) => request(`/batches${companyId ? `?companyId=${companyId}` : ''}`),
    get: (id) => request(`/batches/${id}`),
    create: (data) => request('/batches', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/batches/${id}`, { method: 'DELETE' }),
  },
};