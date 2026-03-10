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
        <div className="modal_overlay">
          <div className="modal_content card" style={{ width: '450px' }}>
            <h2>{editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>ФИО</label>
                <input 
                  type="text" 
                  className="input" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Email</label>
                <input 
                  type="email" 
                  className="input" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Пароль {editingUser && '(оставьте пустым, если не хотите менять)'}</label>
                <input 
                  type="password" 
                  className="input" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser} 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Роль</label>
                <select 
                  className="input" 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="MANAGER">Менеджер</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal_overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal_content {
          padding: 2rem;
          max-width: 90%;
        }
        .badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .badge-primary { background: var(--primary); color: white; }
        .badge-secondary { background: var(--bg-hover); color: var(--text-main); }
      `}</style>
    </div>
  );
}
