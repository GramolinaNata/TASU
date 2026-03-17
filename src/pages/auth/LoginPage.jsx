import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const userData = await login(email, password);
      
      // Если пришли с корня или со списка актов (который по умолчанию), 
      // перенаправляем бухгалтера в его раздел
      const defaultPaths = ["/", "/acts"];
      if (defaultPaths.includes(from)) {
        if (userData.role === 'ACCOUNTANT') {
          navigate("/accountant/general", { replace: true });
        } else {
          navigate("/acts", { replace: true });
        }
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Неверный email или пароль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo">TASU</h1>
          <p className="login-subtitle">Система управления логистикой</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="login-input-wrapper">
              <input 
                type="email" 
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Пароль</label>
            <div className="login-input-wrapper">
              <input 
                type="password" 
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Войти в систему'}
          </button>
        </form>
        
        <div className="login-footer">
          <p className="login-footer-text">
            авторизация для сотрудников
          </p>
        </div>
      </div>
    </div>
  );
}
