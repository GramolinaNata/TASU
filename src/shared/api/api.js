// Use Vite env override when available (falls back to same-origin /api)
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
    create: (data) => request('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/companies/${id}`, {
      method: 'DELETE',
    }),
  },
  requests: {
    list: (companyId) => request(`/requests${companyId ? `?companyId=${companyId}` : ''}`),
    get: (id) => request(`/requests/${id}`),
    create: (data) => request('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/requests/${id}`, {
      method: 'DELETE',
    }),
  },
  users: {
    list: () => request('/users'),
    create: (data) => request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/users/${id}`, {
      method: 'DELETE',
    }),
  },
  contracts: {
    list: (companyId) => request(`/contracts${companyId ? `?companyId=${companyId}` : ''}`),
    get: (id) => request(`/contracts/${id}`),
    create: (data) => request('/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/contracts/${id}`, {
      method: 'DELETE',
    }),
  },
  counterparties: {
    list: (companyId) => request(`/counterparties${companyId ? `?companyId=${companyId}` : ''}`),
    get: (id) => request(`/counterparties/${id}`),
    create: (data) => request('/counterparties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/counterparties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/counterparties/${id}`, {
      method: 'DELETE',
    }),
  },
  public: {
    getAct: (id) => request(`/public/acts/${id}`, { headers: {} }),
  }
};
