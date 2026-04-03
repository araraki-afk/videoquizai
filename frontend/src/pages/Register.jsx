Register.jsx

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../styles/auth.css'

export default function Register() {
  const [step, setStep] = useState(1) // 1: role selection, 2: form
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole)
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Базовая валидация
    if (!name || !surname || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // 1. Склеиваем имя и фамилию для бэкенда (так как бэкенд ожидает full_name)
      const fullName = `${name} ${surname}`.trim();

      // ШАГ 1: Регистрируем пользователя
      const registerResponse = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          full_name: fullName,
          role: role // 'student' или 'teacher'
        })
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        // Перехватываем ошибку FastAPI (например: "Email уже зарегистрирован")
        throw new Error(errorData.detail || 'Ошибка при регистрации');
      }

      const userData = await registerResponse.json(); // Получаем UserResponse

      // ШАГ 2: Автоматически логиним пользователя, чтобы получить access_token
      const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!loginResponse.ok) {
        // Если логин почему-то не прошел (что маловероятно после успешной регистрации), отправляем на страницу входа
        navigate('/login');
        return;
      }

      const tokenData = await loginResponse.json();
      
      // ШАГ 3: Сохраняем сессию в браузере
      localStorage.setItem('token', tokenData.access_token);
      localStorage.setItem('isAuthenticated', 'true');
      
      // Сохраняем профиль для App.jsx
      localStorage.setItem('currentUser', JSON.stringify({
        email: userData.email,
        name: userData.full_name, // App.jsx ожидает поле name
        role: userData.role
      }));

      // ШАГ 4: Редирект на нужный дашборд (полная перезагрузка для обновления роутов)
      window.location.href = userData.role === 'teacher' ? '/teacher' : '/';

    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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

      {step === 1 ? (
        <div className="auth-card register-card">
          <div className="auth-header">
            <h1>VQ</h1>
            <p>Choose Your Role</p>
          </div>

          <div className="role-selector">
            <div 
              className={`role-option ${role === 'student' ? 'active' : ''}`}
              onClick={() =>handleRoleSelect('student')}
            >
              <div className="role-icon">👨‍🎓</div>
              <h3>Student</h3>
              <p>Take tests and track your progress</p>
            </div>

            <div 
              className={`role-option ${role === 'teacher' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('teacher')}
            >
              <div className="role-icon">👨‍🏫</div>
              <h3>Teacher</h3>
              <p>Create tests and manage classes</p>
            </div>
          </div>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
          </div>
        </div>
      ) : (
        <div className="auth-card register-card">
          <div className="auth-header">
            <button 
              type="button" 
              className="back-button"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <h1>VQ</h1>
            <p>Create {role === 'teacher' ? 'Teacher' : 'Student'} Account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">First Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="surname">Last Name</label>
                <input
                  type="text"
                  id="surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Doe"
                  disabled={isLoading}
                />
              </div>
            </div>

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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-auth" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
          </div>
        </div>
      )}
    </div>
  )
}