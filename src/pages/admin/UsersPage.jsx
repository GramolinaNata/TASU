import React, { useState, useEffect } from 'react';
import { api } from '../../shared/api/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Форма
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MANAGER'
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, formData);
      } else {
        await api.users.create(formData);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'MANAGER' });
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        await api.users.delete(id);
        loadUsers();
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
      password: '' // Пароль только если нужно сменить
    });
    setIsModalOpen(true);
  };

  return (
    <div className="users_page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Управление персоналом</h1>
        <button className="btn btn-primary" onClick={() => {
          setEditingUser(null);
          setFormData({ name: '', email: '', password: '', role: 'MANAGER' });
          setIsModalOpen(true);
        }}>
          Добавить пользователя
        </button>
      </div>

      {isLoading ? (
        <div>Загрузка...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Дата регистрации</th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}`}>
                      {user.role === 'ADMIN' ? 'Админ' : 'Менеджер'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm" onClick={() => openEdit(user)} style={{ marginRight: '8px' }}>Редактировать</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal_overlay animate_fade">
          <div className="modal_content card animate_slide_up" style={{ width: '440px', padding: '32px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                    {editingUser ? 'Редактирование профиля' : 'Добавление сотрудника'}
                </h2>
                <button 
                    className="modal_close_btn" 
                    onClick={() => setIsModalOpen(false)}
                >✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form_group_clean">
                <label className="label_clean">Полное имя</label>
                <input 
                  type="text" 
                  className="input_clean" 
                  placeholder="Имя Фамилия"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>

              <div className="form_group_clean" style={{ marginTop: '18px' }}>
                <label className="label_clean">Электронная почта</label>
                <input 
                  type="email" 
                  className="input_clean" 
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </div>

              <div className="form_group_clean" style={{ marginTop: '18px' }}>
                <label className="label_clean">
                    Пароль {editingUser && <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--muted)' }}>(оставьте пустым для сохранения)</span>}
                </label>
                <input 
                  type="password" 
                  className="input_clean" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser} 
                />
              </div>

              <div className="form_group_clean" style={{ marginTop: '18px' }}>
                <label className="label_clean">Уровень доступа</label>
                <select 
                  className="input_clean" 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="MANAGER">Менеджер</option>
                  <option value="ADMIN">Администратор</option>
                </select>
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
        .modal_overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal_close_btn {
            background: none;
            border: none;
            font-size: 18px;
            color: var(--muted);
            cursor: pointer;
            transition: color 0.2s;
            padding: 4px;
        }
        .modal_close_btn:hover { color: var(--text-main); }

        .form_group_clean {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .label_clean {
            font-size: 12px;
            font-weight: 600;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .input_clean {
            width: 100%;
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            background: #fef7c1;
            font-size: 14px;
            transition: all 0.2s ease;
            outline: none;
            color: #333;
        }

        .input_clean:focus {
            border-color: var(--primary);
            background: #fffef0;
            box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
        }

        .btn--primary {
            background: #2563eb;
            color: #fff;
            border: none;
            font-weight: 700;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .btn--primary:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
        }

        .animate_fade { animation: fadeIn 0.2s ease; }
        .animate_slide_up { animation: slideUp 0.3s ease-out; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-primary { background: #f0f7ff; color: #0066ff; border: 1px solid #cce3ff; }
        .badge-secondary { background: #f5f5f5; color: #666; border: 1px solid #e0e0e0; }
      `}</style>
    </div>
  );
}
