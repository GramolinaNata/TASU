import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('tasu_token');
      if (token) {
        try {
          const userData = await api.auth.getMe();
          setUser(userData);
        } catch (err) {
          localStorage.removeItem('tasu_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    const { token, user: userData } = data;
    localStorage.setItem('tasu_token', token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('tasu_token');
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isAccountant }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
