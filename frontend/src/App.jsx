import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import CreateTest from './pages/CreateTest'
import TestTaking from './pages/TestTaking'
import TestResults from './pages/TestResults'
import Classroom from './pages/Classroom'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated')
    const user = localStorage.getItem('currentUser')
    if (auth && user) {
      setIsAuthenticated(true)
      setCurrentUser(JSON.parse(user))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('currentUser')
    setIsAuthenticated(false)
    setCurrentUser(null)
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

  return (
    <Router>
      <div className="app">
        <Sidebar user={currentUser} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route 
              path="/" 
              element={currentUser.role === 'teacher' ? <Navigate to="/teacher" /> : <StudentDashboard user={currentUser} />} 
            />
            <Route path="/teacher" element={<TeacherDashboard user={currentUser} />} />
            <Route path="/create-test" element={<CreateTest />} />
            <Route path="/test/:id" element={<TestTaking />} />
            <Route path="/results/:id" element={<TestResults />} />
            <Route path="/classroom" element={<Classroom />} />
            <Route path="*" element={<Navigate to={currentUser.role === 'teacher' ? '/teacher' : '/'} />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>VQ</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-items">
          <li>
            <Link to={user.role === 'teacher' ? '/teacher' : '/'} className="nav-link">
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
          <li>
            <Link to="/results" className="nav-link">
              <span className="icon">📊</span>
              Результаты
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">👤</div>
          <div className="profile-info">
            <p className="name">{user.name} {user.surname}</p>
            <p className="role">{user.role === 'teacher' ? 'Teacher' : 'Student'}</p>
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
