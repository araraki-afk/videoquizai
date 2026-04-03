Login.jsx

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../styles/auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // ШАГ 1: Логин (отправляем JSON, так как бэкенд ждет LoginRequest)
      const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        // Берем detail из HTTPException бэкенда ("Неверные учетные данные")
        throw new Error(errorData.detail || 'Ошибка при входе'); 
      }

      const tokenData = await loginResponse.json(); // Получаем {"access_token": "..."}
      
      // Сохраняем токен для будущих запросов (создание тестов и т.д.)
      localStorage.setItem('token', tokenData.access_token);

      // ШАГ 2: Получаем профиль пользователя, чтобы узнать его роль
      const userResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${tokenData.access_token}` 
        }
      });

      if (!userResponse.ok) {
        throw new Error('Не удалось загрузить профиль пользователя');
      }

      const userData = await userResponse.json(); // Получаем UserResponse

      // ШАГ 3: Сохраняем данные для App.jsx
      localStorage.setItem('isAuthenticated', 'true');
      
      // Маппинг данных: бэкенд отдает full_name, а фронтенд ожидал name
      localStorage.setItem('currentUser', JSON.stringify({
        email: userData.email,
        name: userData.full_name, // Берем из поля, определенного в auth.py
        role: userData.role
      }));

      // ШАГ 4: Редирект в зависимости от роли
      window.location.href = userData.role === 'teacher' ? '/teacher' : '/';

    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="auth-card login-card">
        <div className="auth-header">
          <h1>VQ</h1>
          <p>Welcome Back!</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-auth" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <div className="auth-footer">
          <p>Don't have an account?<Link to="/register" className="auth-link">Sign up</Link></p>
        </div>
      </div>
    </div>
  )
}