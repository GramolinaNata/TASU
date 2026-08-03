// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { api } from '../api/api';

// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const initAuth = async () => {
//       const token = localStorage.getItem('tasu_token');
//       if (token) {
//         try {
//           const userData = await api.auth.getMe();
//           setUser(userData);
//         } catch (err) {
//           localStorage.removeItem('tasu_token');
//           setUser(null);
//         }
//       }
//       setLoading(false);
//     };
//     initAuth();
//   }, []);

//   const login = async (email, password) => {
//     const data = await api.auth.login(email, password);
//     const { token, user: userData } = data;
//     localStorage.setItem('tasu_token', token);
//     setUser(userData);
//     return userData;
//   };

//   const logout = () => {
//     localStorage.removeItem('tasu_token');
//     setUser(null);
//   };

//   const isAdmin = user?.role === 'ADMIN';
//   const isAccountant = user?.role === 'ACCOUNTANT';
//   const isAccountant2 = user?.role === 'ACCOUNTANT2';
//   const isCourier = user?.role === 'COURIER';

//   return (
//     <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isAccountant, isAccountant2, isCourier }}>
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error('useAuth must be used within AuthProvider');
//   return context;
// };


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
    // 🆕 ТЗ v2: на выходе сбрасываем выбранную компанию (важно для PRIVATE)
    localStorage.removeItem('tasu_company_selected_v2');
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isAccountant2 = user?.role === 'ACCOUNTANT2';
  const isCourier = user?.role === 'COURIER';
  // 🆕 ТЗ v2
  const isPrivate = user?.role === 'PRIVATE';
  const isManager = user?.role === 'MANAGER';
  // ТЗ: урезанная роль «Менеджер (ограниченный)». Принимает груз, создаёт
  // заявки и партии, но не формирует ведомости и не видит суммы выплат
  // перевозчику и представителю. Права MANAGER при этом не меняются.
  const isManager2 = user?.role === 'MANAGER2';

  // ТЗ: ограниченный менеджер не видит денег НИГДЕ. Один флаг на всю систему,
  // чтобы каждое новое место с суммой не приходилось вспоминать отдельно —
  // раньше проверка `!isManager` жила в одном файле и отсутствовала в трёх.
  //
  // Граница проведена по смыслу, а не по слову «сумма»:
  //   скрываем — выплаты перевозчику и представителю, денежные итоги
  //   в ведомостях, отчётах и партиях, стоимость перевозки, колонки «Сумма»
  //   в списках и карточках заявок;
  //   НЕ скрываем — поля, куда роль сама вводит цену при приёме груза,
  //   и чек клиенту: без них роль нерабочая.
  const canSeeMoney = !isManager2;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isAccountant,
        isAccountant2,
        isCourier,
        isPrivate,
        isManager,
        isManager2,
        canSeeMoney,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};