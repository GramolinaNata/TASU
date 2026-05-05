// import React, { useState, useEffect, useMemo } from 'react';
// import { api } from '../../shared/api/api';

// export default function UsersPage() {
//   const [users, setUsers] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingUser, setEditingUser] = useState(null);
//   const [roleFilter, setRoleFilter] = useState('ALL');
//   const [searchQuery, setSearchQuery] = useState('');

//   // Сортировка
//   const [sortBy, setSortBy] = useState('createdAt');
//   const [sortOrder, setSortOrder] = useState('desc');

//   // Показ паролей
//   const [revealedPasswords, setRevealedPasswords] = useState(new Set());
//   const [showAllPasswords, setShowAllPasswords] = useState(false);

//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     password: '',
//     role: 'MANAGER'
//   });

//   const loadUsers = async () => {
//     setIsLoading(true);
//     try {
//       const data = await api.users.list({ sortBy, order: sortOrder });
//       setUsers(data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadUsers();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [sortBy, sortOrder]);

//   const filteredUsers = useMemo(() => {
//     let list = [...users];
//     if (roleFilter !== 'ALL') {
//       list = list.filter(u => u.role === roleFilter);
//     }
//     if (searchQuery.trim()) {
//       const s = searchQuery.toLowerCase().trim();
//       list = list.filter(u =>
//         u.name?.toLowerCase().includes(s) ||
//         u.email?.toLowerCase().includes(s)
//       );
//     }
//     return list;
//   }, [users, roleFilter, searchQuery]);

//   const handleSort = (field) => {
//     if (sortBy === field) {
//       setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortBy(field);
//       setSortOrder('asc');
//     }
//   };

//   const getSortIndicator = (field) => {
//     if (sortBy !== field) return '';
//     return sortOrder === 'asc' ? ' ↑' : ' ↓';
//   };

//   const togglePasswordReveal = (userId) => {
//     setRevealedPasswords(prev => {
//       const next = new Set(prev);
//       if (next.has(userId)) next.delete(userId);
//       else next.add(userId);
//       return next;
//     });
//   };

//   const toggleShowAllPasswords = () => {
//     if (showAllPasswords) {
//       setRevealedPasswords(new Set());
//       setShowAllPasswords(false);
//     } else {
//       setRevealedPasswords(new Set(users.map(u => u.id)));
//       setShowAllPasswords(true);
//     }
//   };

//   const renderPassword = (user) => {
//     const isRevealed = revealedPasswords.has(user.id);
//     const pwd = user.plainPassword;

//     if (!pwd) {
//       return (
//         <span style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
//           — (сбросьте пароль)
//         </span>
//       );
//     }

//     return (
//       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//         <code style={{
//           fontFamily: 'ui-monospace, monospace',
//           fontSize: '13px',
//           background: '#f5f5f5',
//           padding: '2px 8px',
//           borderRadius: '4px',
//           minWidth: '80px',
//           display: 'inline-block'
//         }}>
//           {isRevealed ? pwd : '••••••••'}
//         </code>
//         <button
//           type="button"
//           onClick={() => togglePasswordReveal(user.id)}
//           title={isRevealed ? 'Скрыть' : 'Показать'}
//           style={{
//             background: isRevealed ? '#e0e7ff' : '#f3f4f6',
//             border: '1px solid var(--border-color)',
//             borderRadius: '4px',
//             padding: '3px 10px',
//             cursor: 'pointer',
//             fontSize: '12px',
//             fontWeight: 500,
//             color: '#374151'
//           }}
//         >
//           {isRevealed ? 'Скрыть' : 'Показать'}
//         </button>
//         {isRevealed && (
//           <button
//             type="button"
//             onClick={() => {
//               navigator.clipboard.writeText(pwd);
//             }}
//             title="Скопировать в буфер обмена"
//             style={{
//               background: '#f3f4f6',
//               border: '1px solid var(--border-color)',
//               borderRadius: '4px',
//               padding: '3px 10px',
//               cursor: 'pointer',
//               fontSize: '12px',
//               fontWeight: 500,
//               color: '#374151'
//             }}
//           >
//             Копировать
//           </button>
//         )}
//       </div>
//     );
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       if (editingUser) {
//         await api.users.update(editingUser.id, formData);
//       } else {
//         await api.users.create(formData);
//       }
//       setIsModalOpen(false);
//       setEditingUser(null);
//       setFormData({ name: '', email: '', password: '', role: 'MANAGER' });
//       loadUsers();
//     } catch (err) {
//       alert(err.message);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
//       try {
//         await api.users.delete(id);
//         loadUsers();
//       } catch (err) {
//         alert(err.message);
//       }
//     }
//   };

//   const openEdit = (user) => {
//     setEditingUser(user);
//     setFormData({
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       password: ''
//     });
//     setIsModalOpen(true);
//   };

//   const getRoleName = (role) => {
//     if (role === 'ADMIN') return 'Админ';
//     if (role === 'ACCOUNTANT') return 'Бухгалтер';
//     if (role === 'ACCOUNTANT2') return 'Бухгалтер 2';
//     if (role === 'COURIER') return 'Курьер';
//     return 'Менеджер';
//   };

//   const getRoleBadge = (role) => {
//     if (role === 'ADMIN') return 'badge-primary';
//     if (role === 'ACCOUNTANT') return 'badge-info';
//     if (role === 'ACCOUNTANT2') return 'badge-info';
//     if (role === 'COURIER') return 'badge-warning';
//     return 'badge-secondary';
//   };

//   return (
//     <div className="users_page">
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
//         <h1>Управление персоналом</h1>
//         <div style={{ display: 'flex', gap: '12px' }}>
//           <button
//             className="btn"
//             onClick={toggleShowAllPasswords}
//             style={{
//               background: showAllPasswords ? '#fef3c7' : '#f3f4f6',
//               border: '1px solid var(--border-color)',
//               fontWeight: 500
//             }}
//           >
//             {showAllPasswords ? 'Скрыть пароли' : 'Показать все пароли'}
//           </button>
//           <button className="btn btn-primary" onClick={() => {
//             setEditingUser(null);
//             setFormData({ name: '', email: '', password: '', role: 'MANAGER' });
//             setIsModalOpen(true);
//           }}>
//             + Добавить сотрудника
//           </button>
//         </div>
//       </div>

//       <div className="filter-bar card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
//         <div className="form_group_clean" style={{ flex: 2, minWidth: '200px' }}>
//           <label className="label_clean">Поиск сотрудника</label>
//           <input type="text" className="input_clean" placeholder="Имя или email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
//         </div>
//         <div className="form_group_clean" style={{ flex: 1, minWidth: '160px' }}>
//           <label className="label_clean">Фильтр по роли</label>
//           <select className="input_clean" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
//             <option value="ALL">Все роли</option>
//             <option value="ADMIN">Администраторы</option>
//             <option value="MANAGER">Менеджеры</option>
//             <option value="ACCOUNTANT">Бухгалтеры</option>
//             <option value="ACCOUNTANT2">Бухгалтер 2</option>
//             <option value="COURIER">Курьеры</option>
//           </select>
//         </div>
//       </div>

//       {isLoading ? (
//         <div>Загрузка...</div>
//       ) : (
//         <div className="card">
//           <table className="table">
//             <thead>
//               <tr>
//                 <th
//                   style={{ cursor: 'pointer', userSelect: 'none' }}
//                   onClick={() => handleSort('name')}
//                   title="Сортировать по имени"
//                 >
//                   Имя{getSortIndicator('name')}
//                 </th>
//                 <th
//                   style={{ cursor: 'pointer', userSelect: 'none' }}
//                   onClick={() => handleSort('email')}
//                   title="Сортировать по email"
//                 >
//                   Email{getSortIndicator('email')}
//                 </th>
//                 <th
//                   style={{ cursor: 'pointer', userSelect: 'none' }}
//                   onClick={() => handleSort('role')}
//                   title="Сортировать по роли"
//                 >
//                   Роль{getSortIndicator('role')}
//                 </th>
//                 <th>Пароль</th>
//                 <th
//                   style={{ cursor: 'pointer', userSelect: 'none' }}
//                   onClick={() => handleSort('createdAt')}
//                   title="Сортировать по дате"
//                 >
//                   Дата регистрации{getSortIndicator('createdAt')}
//                 </th>
//                 <th style={{ textAlign: 'right' }}>Действия</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredUsers.length === 0 ? (
//                 <tr>
//                   <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
//                     Сотрудники не найдены
//                   </td>
//                 </tr>
//               ) : (
//                 filteredUsers.map(user => (
//                   <tr key={user.id}>
//                     <td>{user.name}</td>
//                     <td>{user.email}</td>
//                     <td>
//                       <span className={`badge ${getRoleBadge(user.role)}`}>
//                         {getRoleName(user.role)}
//                       </span>
//                     </td>
//                     <td>{renderPassword(user)}</td>
//                     <td>{new Date(user.createdAt).toLocaleDateString()}</td>
//                     <td style={{ textAlign: 'right' }}>
//                       <button className="btn btn-sm" onClick={() => openEdit(user)} style={{ marginRight: '8px' }}>Редактировать</button>
//                       <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>Удалить</button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {isModalOpen && (
//         <div className="modal_overlay animate_fade">
//           <div className="modal_content card animate_slide_up" style={{ width: '440px', padding: '32px', border: '1px solid var(--border-color)' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
//               <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
//                 {editingUser ? 'Редактирование профиля' : 'Добавление сотрудника'}
//               </h2>
//               <button className="modal_close_btn" onClick={() => setIsModalOpen(false)}>×</button>
//             </div>

//             <form onSubmit={handleSubmit}>
//               <div className="form_group_clean">
//                 <label className="label_clean">Полное имя</label>
//                 <input type="text" className="input_clean" placeholder="Имя Фамилия" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
//               </div>

//               <div className="form_group_clean" style={{ marginTop: '18px' }}>
//                 <label className="label_clean">Электронная почта</label>
//                 <input type="email" className="input_clean" placeholder="name@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
//               </div>

//               <div className="form_group_clean" style={{ marginTop: '18px' }}>
//                 <label className="label_clean">
//                   Пароль {editingUser && <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--muted)' }}>(оставьте пустым для сохранения)</span>}
//                 </label>
//                 <input type="text" className="input_clean" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUser} />
//               </div>

//               <div className="form_group_clean" style={{ marginTop: '18px' }}>
//                 <label className="label_clean">Уровень доступа</label>
//                 <select className="input_clean" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
//                   <option value="MANAGER">Менеджер</option>
//                   <option value="ACCOUNTANT">Бухгалтер</option>
//                   <option value="ACCOUNTANT2">Бухгалтер 2</option>
//                   <option value="COURIER">Курьер</option>
//                   <option value="ADMIN">Администратор</option>
//                 </select>
//               </div>

//               <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
//                 <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Отмена</button>
//                 <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
//                   {editingUser ? 'Сохранить изменения' : 'Создать сотрудника'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       <style>{`
//         .modal_overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
//         .modal_close_btn { background: none; border: none; font-size: 24px; color: var(--muted); cursor: pointer; transition: color 0.2s; padding: 4px; line-height: 1; }
//         .modal_close_btn:hover { color: var(--text-main); }
//         .form_group_clean { display: flex; flex-direction: column; gap: 6px; }
//         .label_clean { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
//         .input_clean { width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: #fef7c1; font-size: 14px; transition: all 0.2s ease; outline: none; color: #333; }
//         .input_clean:focus { border-color: var(--primary); background: #fffef0; box-shadow: 0 0 0 3px rgba(0,102,255,0.1); }
//         .btn--primary { background: #2563eb; color: #fff; border: none; font-weight: 700; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
//         .btn--primary:hover { background: #1d4ed8; transform: translateY(-1px); }
//         .animate_fade { animation: fadeIn 0.2s ease; }
//         .animate_slide_up { animation: slideUp 0.3s ease-out; }
//         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
//         @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
//         .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
//         .badge-primary { background: #f0f7ff; color: #0066ff; border: 1px solid #cce3ff; }
//         .badge-info { background: #e6fffb; color: #08979c; border: 1px solid #87e8de; }
//         .badge-warning { background: #fffbe6; color: #d48806; border: 1px solid #ffe58f; }
//         .badge-secondary { background: #f5f5f5; color: #666; border: 1px solid #e0e0e0; }
//       `}</style>
//     </div>
//   );
// } 


import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../shared/api/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]); // 🆕 ТЗ v2
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [revealedPasswords, setRevealedPasswords] = useState(new Set());
  const [showAllPasswords, setShowAllPasswords] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MANAGER',
    // 🆕 ТЗ v2
    assignedCompanyId: '',
    contactPhone: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [u, c] = await Promise.all([
        api.users.list({ sortBy, order: sortOrder }),
        api.companies.list().catch(() => []),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setCompanies(Array.isArray(c) ? c : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (roleFilter !== 'ALL') {
      list = list.filter(u => u.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase().trim();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [users, roleFilter, searchQuery]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const getSortIndicator = (field) => {
    if (sortBy !== field) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const togglePasswordReveal = (userId) => {
    setRevealedPasswords(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleShowAllPasswords = () => {
    if (showAllPasswords) {
      setRevealedPasswords(new Set());
      setShowAllPasswords(false);
    } else {
      setRevealedPasswords(new Set(users.map(u => u.id)));
      setShowAllPasswords(true);
    }
  };

  const renderPassword = (user) => {
    const isRevealed = revealedPasswords.has(user.id);
    const pwd = user.plainPassword;

    if (!pwd) {
      return (
        <span style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
          — (сбросьте пароль)
        </span>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <code style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: '13px',
          background: '#f5f5f5',
          padding: '2px 8px',
          borderRadius: '4px',
          minWidth: '80px',
          display: 'inline-block'
        }}>
          {isRevealed ? pwd : '••••••••'}
        </code>
        <button
          type="button"
          onClick={() => togglePasswordReveal(user.id)}
          title={isRevealed ? 'Скрыть' : 'Показать'}
          style={{
            background: isRevealed ? '#e0e7ff' : '#f3f4f6',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '3px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            color: '#374151'
          }}
        >
          {isRevealed ? 'Скрыть' : 'Показать'}
        </button>
        {isRevealed && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(pwd)}
            title="Скопировать"
            style={{
              background: '#f3f4f6',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: '#374151'
            }}
          >
            Копировать
          </button>
        )}
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 🆕 ТЗ v2: Если роль PRIVATE — обязательна привязка к компании
      if (formData.role === 'PRIVATE' && !formData.assignedCompanyId) {
        alert('Для частного лица необходимо выбрать компанию');
        return;
      }

      const payload = { ...formData };

      // Если не PRIVATE — assignedCompanyId не нужен
      if (payload.role !== 'PRIVATE') {
        payload.assignedCompanyId = null;
      }

      if (editingUser) {
        await api.users.update(editingUser.id, payload);
      } else {
        await api.users.create(payload);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'MANAGER', assignedCompanyId: '', contactPhone: '' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        await api.users.delete(id);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      assignedCompanyId: user.assignedCompanyId || '',
      contactPhone: user.contactPhone || '',
    });
    setIsModalOpen(true);
  };

  const getRoleName = (role) => {
    if (role === 'ADMIN') return 'Админ';
    if (role === 'ACCOUNTANT') return 'Бухгалтер';
    if (role === 'ACCOUNTANT2') return 'Бухгалтер 2';
    if (role === 'COURIER') return 'Курьер';
    if (role === 'PRIVATE') return 'Частное лицо'; // 🆕 ТЗ v2
    return 'Менеджер';
  };

  const getRoleBadge = (role) => {
    if (role === 'ADMIN') return 'badge-primary';
    if (role === 'ACCOUNTANT') return 'badge-info';
    if (role === 'ACCOUNTANT2') return 'badge-info';
    if (role === 'COURIER') return 'badge-warning';
    if (role === 'PRIVATE') return 'badge-private'; // 🆕 ТЗ v2
    return 'badge-secondary';
  };

  // 🆕 ТЗ v2: Найти название компании по id
  const getCompanyName = (id) => companies.find(c => c.id === id)?.name || '—';

  return (
    <div className="users_page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Управление персоналом</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn"
            onClick={toggleShowAllPasswords}
            style={{
              background: showAllPasswords ? '#fef3c7' : '#f3f4f6',
              border: '1px solid var(--border-color)',
              fontWeight: 500
            }}
          >
            {showAllPasswords ? 'Скрыть пароли' : 'Показать все пароли'}
          </button>
          <button className="btn btn-primary" onClick={() => {
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '', role: 'MANAGER', assignedCompanyId: '', contactPhone: '' });
            setIsModalOpen(true);
          }}>
            + Добавить сотрудника
          </button>
        </div>
      </div>

      <div className="filter-bar card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form_group_clean" style={{ flex: 2, minWidth: '200px' }}>
          <label className="label_clean">Поиск сотрудника</label>
          <input type="text" className="input_clean" placeholder="Имя или email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="form_group_clean" style={{ flex: 1, minWidth: '160px' }}>
          <label className="label_clean">Фильтр по роли</label>
          <select className="input_clean" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="ALL">Все роли</option>
            <option value="ADMIN">Администраторы</option>
            <option value="MANAGER">Менеджеры</option>
            <option value="ACCOUNTANT">Бухгалтеры</option>
            <option value="ACCOUNTANT2">Бухгалтер 2</option>
            <option value="COURIER">Курьеры</option>
            <option value="PRIVATE">Частные лица</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div>Загрузка...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>
                  Имя{getSortIndicator('name')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('email')}>
                  Email{getSortIndicator('email')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('role')}>
                  Роль{getSortIndicator('role')}
                </th>
                <th>Компания / Телефон</th>
                <th>Пароль</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('createdAt')}>
                  Дата регистрации{getSortIndicator('createdAt')}
                </th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    Сотрудники не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${getRoleBadge(user.role)}`}>
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td>
                      {/* 🆕 ТЗ v2: Привязанная компания + телефон */}
                      {user.role === 'PRIVATE' && user.assignedCompanyId && (
                        <div style={{ fontSize: '0.85rem' }}>
                          🏢 {getCompanyName(user.assignedCompanyId)}
                        </div>
                      )}
                      {user.contactPhone && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                          📞 {user.contactPhone}
                        </div>
                      )}
                      {!user.contactPhone && !(user.role === 'PRIVATE' && user.assignedCompanyId) && (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{renderPassword(user)}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm" onClick={() => openEdit(user)} style={{ marginRight: '8px' }}>Редактировать</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>Удалить</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal_overlay animate_fade">
          <div className="modal_content card animate_slide_up" style={{
  width: '480px',
  padding: '32px',
  border: '1px solid var(--border-color)',
  maxHeight: '90vh',
  overflowY: 'auto'
}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                {editingUser ? 'Редактирование профиля' : 'Добавление сотрудника'}
              </h2>
              <button className="modal_close_btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form_group_clean">
                <label className="label_clean">Полное имя</label>
                <input type="text" className="input_clean" placeholder="Имя Фамилия" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>

              <div className="form_group_clean" style={{ marginTop: '18px' }}>
                <label className="label_clean">Электронная почта</label>
                <input type="email" className="input_clean" placeholder="name@company.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>

              <div className="form_group_clean" style={{ marginTop: '18px' }}>
                <label className="label_clean">
                  Пароль {editingUser && <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--muted)' }}>(оставьте пустым для сохранения)</span>}
                </label>
                <input type="text" className="input_clean" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
              </div>

              <div className="form_group_clean" style={{ marginTop: '18px' }}>
                <label className="label_clean">Уровень доступа</label>
                <select className="input_clean" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                  <option value="MANAGER">Менеджер</option>
                  <option value="ACCOUNTANT">Бухгалтер</option>
                  <option value="ACCOUNTANT2">Бухгалтер 2</option>
                  <option value="COURIER">Курьер</option>
                  <option value="PRIVATE">👤 Частное лицо</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </div>

              {/* 🆕 ТЗ v2: Если PRIVATE — выбор компании обязателен */}
              {formData.role === 'PRIVATE' && (
                <div className="form_group_clean" style={{ marginTop: '18px', padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fbbf24' }}>
                  <label className="label_clean">
                    Компания * <span style={{ fontWeight: 400, fontSize: '11px', color: '#92400e' }}>(от какой компании работает частное лицо)</span>
                  </label>
                  <select
                    className="input_clean"
                    value={formData.assignedCompanyId}
                    onChange={e => setFormData({ ...formData, assignedCompanyId: e.target.value })}
                    required
                  >
                    <option value="">— Выберите компанию —</option>
                    {companies.filter(c => c.status !== 'canceled').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 🆕 ТЗ v2: Контактный телефон */}
              <div className="form_group_clean" style={{ marginTop: '18px' }}>
                <label className="label_clean">Контактный телефон</label>
                <input
                  type="tel"
                  className="input_clean"
                  placeholder="+7 (707) ..."
                  value={formData.contactPhone}
                  onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Отмена</button>
                <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
                  {editingUser ? 'Сохранить изменения' : 'Создать сотрудника'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal_overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal_close_btn { background: none; border: none; font-size: 24px; color: var(--muted); cursor: pointer; transition: color 0.2s; padding: 4px; line-height: 1; }
        .modal_close_btn:hover { color: var(--text-main); }
        .form_group_clean { display: flex; flex-direction: column; gap: 6px; }
        .label_clean { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .input_clean { width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: #fef7c1; font-size: 14px; transition: all 0.2s ease; outline: none; color: #333; }
        .input_clean:focus { border-color: var(--primary); background: #fffef0; box-shadow: 0 0 0 3px rgba(0,102,255,0.1); }
        .btn--primary { background: #2563eb; color: #fff; border: none; font-weight: 700; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
        .btn--primary:hover { background: #1d4ed8; transform: translateY(-1px); }
        .animate_fade { animation: fadeIn 0.2s ease; }
        .animate_slide_up { animation: slideUp 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-primary { background: #f0f7ff; color: #0066ff; border: 1px solid #cce3ff; }
        .badge-info { background: #e6fffb; color: #08979c; border: 1px solid #87e8de; }
        .badge-warning { background: #fffbe6; color: #d48806; border: 1px solid #ffe58f; }
        .badge-secondary { background: #f5f5f5; color: #666; border: 1px solid #e0e0e0; }
        .badge-private { background: #faf5ff; color: #7c3aed; border: 1px solid #ddd6fe; }
      `}</style>
    </div>
  );
}