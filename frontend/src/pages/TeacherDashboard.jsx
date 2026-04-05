import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/pages.css'

export default function TeacherDashboard({ user }) {
  const [content, setContent] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [contentRes, classroomRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/content/my`, { headers }),
          fetch(`${API_URL}/api/v1/classroom/my`, { headers }),
        ])

        if (contentRes.ok) {
          const data = await contentRes.json()
          setContent(data)
        }
        if (classroomRes.ok) {
          const data = await classroomRes.json()
          setClassrooms(data)
        }
      } catch (err) {
        setError('Ошибка при загрузке данных')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalStudents = classrooms.reduce((sum, c) => sum + (c.member_count || 0), 0)
  const doneContent = content.filter(c => c.status === 'done').length
  const processingContent = content.filter(c => c.status === 'proccesing' || c.status === 'pending').length

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    )
  }

  return (
    <div className="dashboard page-container">
      <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Добро пожаловать, {user?.name || 'Преподаватель'}! 👨‍🏫</h1>
          <p className="subtitle" style={{ color: 'rgba(255,255,255,0.9)' }}>Управляйте материалами и группами</p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{classrooms.length}</span>
            <span className="stat-label">Групп</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalStudents}</span>
            <span className="stat-label">Студентов</span>
          </div>
          <div className="stat">
            <span className="stat-value">{doneContent}</span>
            <span className="stat-label">Материалов</span>
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', marginBottom: '1.5rem' }}>{error}</div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link to="/create-test" className="btn-generate" style={{ textDecoration: 'none', width: 'auto', padding: '0.8rem 1.5rem', display: 'inline-flex' }}>
          ➕ Создать тест
        </Link>
        <Link to="/classroom" className="btn-nav btn-back" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          🏫 Управление группами
        </Link>
      </div>

      {/* Content / Materials */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📚 Ваши материалы</h2>
        </div>

        {content.length === 0 ? (
          <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b', textAlign: 'center' }}>
            Вы ещё не загрузили ни одного материала. <Link to="/create-test" style={{ color: '#4f46e5' }}>Создайте первый тест →</Link>
          </div>
        ) : (
          <div className="tests-grid">
            {content.map(item => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Classrooms */}
      <section>
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🏫 Ваши группы</h2>
          <Link to="/classroom" className="view-all-link">Все группы →</Link>
        </div>

        {classrooms.length === 0 ? (
          <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b', textAlign: 'center' }}>
            Нет созданных групп. <Link to="/classroom" style={{ color: '#4f46e5' }}>Создать группу →</Link>
          </div>
        ) : (
          <div className="classes-grid">
            {classrooms.map(cls => (
              <div key={cls.id} className="content-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{cls.name}</h3>
                  <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {cls.member_count || 0} уч.
                  </span>
                </div>
                {cls.description && (
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>{cls.description}</p>
                )}
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Код: <strong style={{ color: '#475569' }}>{cls.invite_code}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}


function ContentCard({ item }) {
  const statusMap = {
    pending: { label: 'В очереди', color: '#f59e0b', bg: '#fffbeb' },
    proccesing: { label: 'Обработка...', color: '#3b82f6', bg: '#eff6ff' },
    done: { label: 'Готово', color: '#10b981', bg: '#ecfdf5' },
    failed: { label: 'Ошибка', color: '#ef4444', bg: '#fef2f2' },
  }
  const typeMap = {
    youtube_url: '🎥 YouTube',
    raw_text: '📝 Текст',
    uploaded_video: '📁 Файл',
  }

  const st = statusMap[item.status] || statusMap.pending

  return (
    <div className="test-card content-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', flex: 1 }}>{item.title}</h3>
        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
          {st.label}
        </span>
      </div>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
        {typeMap[item.content_type] || item.content_type}
      </div>
    </div>
  )
}