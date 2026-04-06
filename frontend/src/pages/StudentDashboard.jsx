import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/pages.css'

export default function StudentDashboard({ user }) {
  const [classrooms, setClassrooms] = useState([])
  const [contentByClassroom, setContentByClassroom] = useState({})
  const [attempts, setAttempts] = useState([])
  const [stats, setStats] = useState({ avgScore: 0, totalAttempts: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch analytics (past attempts)
        const analyticsRes = await fetch(`${API_URL}/api/v1/analytics/me`, { headers })
        if (analyticsRes.ok) {
          const data = await analyticsRes.json()
          setAttempts(data.history || [])
          setStats({ avgScore: data.average_score || 0, totalAttempts: data.total_attempts || 0 })
        }

        // Fetch classrooms
        const crRes = await fetch(`${API_URL}/api/v1/classroom/my`, { headers })
        if (crRes.ok) {
          const crData = await crRes.json()
          setClassrooms(crData)

          // For each classroom, fetch assigned content
          const contentMap = {}
          for (const cr of crData) {
            const cRes = await fetch(`${API_URL}/api/v1/classroom/${cr.id}/content-for-student`, { headers })
            if (cRes.ok) {
              contentMap[cr.id] = await cRes.json()
            }
          }
          setContentByClassroom(contentMap)
        }
      } catch (err) {
        setError('Ошибка при загрузке данных')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    )
  }

  const allContent = Object.values(contentByClassroom).flat()

  return (
    <div className="dashboard page-container">
      <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Добро пожаловать, {user?.name || 'Студент'}! 👋</h1>
          <p className="subtitle" style={{ color: 'rgba(255,255,255,0.9)' }}>Ваши материалы и тесты</p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{classrooms.length}</span>
            <span className="stat-label">Групп</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.totalAttempts}</span>
            <span className="stat-label">Попыток</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.avgScore.toFixed(0)}%</span>
            <span className="stat-label">Средний балл</span>
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', marginBottom: '1.5rem' }}>{error}</div>
      )}

      {/* No classrooms prompt */}
      {classrooms.length === 0 && (
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem', marginBottom: '2rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏫</p>
          <h3 style={{ marginBottom: '0.5rem' }}>Вы ещё не состоите ни в одной группе</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Попросите преподавателя прислать вам код-приглашение</p>
          <Link to="/classroom" className="btn-generate" style={{ display: 'inline-block', width: 'auto', padding: '0.8rem 2rem', textDecoration: 'none' }}>
            Присоединиться к группе
          </Link>
        </div>
      )}

      {/* Assigned materials by classroom */}
      {classrooms.map(cr => {
        const items = contentByClassroom[cr.id] || []
        return (
          <section key={cr.id} style={{ marginBottom: '2.5rem' }}>
            <div className="section-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📚 {cr.name}
              </h2>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                Преподаватель ещё не назначил материалов в эту группу.
              </div>
            ) : (
              <div className="tests-grid">
                {items.map(item => (
                  <div key={item.content_id} className="test-card content-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#1e293b' }}>{item.title}</h3>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <span>{item.content_type === 'youtube_url' ? '🎥' : '📝'} {item.quiz_difficulty === 'easy' ? 'Лёгкий' : item.quiz_difficulty === 'hard' ? 'Сложный' : 'Средний'}</span>
                      {item.quizzes.length > 0 && <span>📋 {item.quizzes[0].question_count} вопросов</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                      {/* Summary link */}
                      <Link to={`/content/${item.content_id}`} className="btn-nav btn-back" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.6rem' }}>
                        📖 Читать конспект
                      </Link>
                      {/* Quiz link */}
                      {item.quizzes.length > 0 && (
                        <Link to={`/test/${item.quizzes[0].id}`} className="btn-generate" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.6rem', margin: 0 }}>
                          Пройти тест 🚀
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      {/* Past attempts */}
      {attempts.length > 0 && (
        <section>
          <div className="section-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📊 История попыток</h2>
          </div>
          <div className="tests-grid">
            {attempts.map(a => {
              const isSuccess = a.score >= 70
              return (
                <Link key={a.attempt_id} to={`/results/${a.attempt_id}`} className="test-card content-card" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#1e293b' }}>{a.quiz_title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(a.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <span style={{ fontWeight: '700', color: isSuccess ? '#10b981' : '#ef4444', fontSize: '1.1rem' }}>
                      {a.score}%
                    </span>
                  </div>
                  <div className="score-bar" style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${a.score}%`, height: '100%', background: isSuccess ? '#10b981' : '#ef4444' }}></div>
                  </div>
                  <div style={{ color: '#4f46e5', fontSize: '0.85rem', fontWeight: '500', marginTop: '0.8rem' }}>
                    Посмотреть результаты →
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}