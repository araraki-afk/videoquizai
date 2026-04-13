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
    localStorage.removeItem('token')
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