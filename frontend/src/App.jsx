import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import CreateTest from './pages/CreateTest'
import TestTaking from './pages/TestTaking'
import TestResults from './pages/TestResults'
import Classroom from './pages/Classroom'
import ContentDetail from './pages/ContentDetail'
import ClassroomAnalytics from './pages/ClassroomAnalytics'
import logo from './assets/logo_vq.png'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const verifyAuth = async () => {
      const auth = localStorage.getItem('isAuthenticated')
      const user = localStorage.getItem('currentUser')
      const token = localStorage.getItem('token')

      if (!auth || !user || !token) {
        setIsCheckingAuth(false)
        return
      }

      try {
        const res = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const userData = await res.json()
          const freshUser = {
            email: userData.email,
            name: userData.full_name,
            role: userData.role,
          }
          localStorage.setItem('currentUser', JSON.stringify(freshUser))
          setIsAuthenticated(true)
          setCurrentUser(freshUser)
        } else {
          // Token expired or invalid — clear everything
          localStorage.removeItem('isAuthenticated')
          localStorage.removeItem('currentUser')
          localStorage.removeItem('token')
        }
      } catch {
        // Network error — trust localStorage as fallback
        setIsAuthenticated(true)
        setCurrentUser(JSON.parse(user))
      } finally {
        setIsCheckingAuth(false)
      }
    }
    verifyAuth()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setCurrentUser(null)
  }

  if (isCheckingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8f9fa' }}>
<div 
  className="loading-spinner" 
  style={{ 
    width: '3rem', 
    height: '3rem', 
    border: '3px solid #e2e8f0', 
    borderTopColor: '#6b3fa0', 
    borderRadius: '50%', 
    animation: 'spin 1s linear infinite' 
  }}
></div>      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    )
  }

  const isTeacher = currentUser.role === 'teacher'

  return (
    <Router>
      <div className="app">
        <Sidebar user={currentUser} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={isTeacher ? <Navigate to="/teacher" /> : <StudentDashboard user={currentUser} />} />
            <Route path="/teacher" element={<TeacherDashboard user={currentUser} />} />
            <Route path="/create-test" element={<CreateTest />} />
            <Route path="/test/:id" element={<TestTaking />} />
            <Route path="/results/:id" element={<TestResults />} />
            <Route path="/content/:id" element={<ContentDetail />} />
            <Route path="/classroom/:id/analytics" element={<ClassroomAnalytics />} />
            <Route path="/classroom/:id" element={<Classroom user={currentUser} />} />
            <Route path="/classroom" element={<Classroom user={currentUser} />} />
            <Route path="*" element={<Navigate to={isTeacher ? '/teacher' : '/'} />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function Sidebar({ user, onLogout }) {
  const isTeacher = user.role === 'teacher'

  return (

    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Video Quiz AI" className="sidebar-logo" />
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-items">
          <li>
            <Link to={isTeacher ? '/teacher' : '/'} className="nav-link">
              <span className="icon">📚</span>
              Главная
            </Link>
          </li>
          <li>
            <Link to="/classroom" className="nav-link">
              <span className="icon">🏫</span>
              Группы
            </Link>
          </li>
          <li>
            <Link to="/create-test" className="nav-link">
              <span className="icon">➕</span>
              Создать тест
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">👤</div>
          <div className="profile-info">
            <p className="name">{user.name}</p>
            <p className="role">{isTeacher ? 'Преподаватель' : 'Студент'}</p>
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          Выйти
        </button>
      </div>
    </aside>
  )
}

export default App