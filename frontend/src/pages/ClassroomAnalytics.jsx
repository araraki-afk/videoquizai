import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/pages.css'

export default function ClassroomAnalytics() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [selectedTest, setSelectedTest] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const token = localStorage.getItem('token')
  const headers = { 'Authorization': `Bearer ${token}` }

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`${API_URL}/api/v1/classroom/${id}/analytics`, { headers })
        if (!res.ok) throw new Error('Ошибка загрузки')
        const result = await res.json()
        setData(result)
        // Auto-select first test
        if (result.attempts?.length > 0) {
          const firstTest = result.attempts[0].quiz_title
          setSelectedTest(firstTest)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAnalytics()
  }, [id])

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Ошибка</h2>
          <p style={{ color: '#64748b' }}>{error || 'Данные не загружены'}</p>
          <button className="btn-generate" onClick={() => navigate(-1)}>Назад</button>
        </div>
      </div>
    )
  }

  // Group attempts by test
  const attemptsByTest = {}
  data.attempts.forEach(a => {
    if (!attemptsByTest[a.quiz_title]) {
      attemptsByTest[a.quiz_title] = []
    }
    attemptsByTest[a.quiz_title].push(a)
  })

  const tests = Object.keys(attemptsByTest)
  const currentTestAttempts = selectedTest ? attemptsByTest[selectedTest] : []

  // Get student details
  const currentStudentAttempts = selectedStudent
    ? currentTestAttempts.filter(a => a.student_name === selectedStudent)
    : []

  const scoreColor = (s) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '0.3rem', padding: 0 }}>
            ← Назад
          </button>
          <h1>📊 Аналитика: {data.classroom_name}</h1>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{data.total_students}</span>
            <span className="stat-label">Студентов</span>
          </div>
          <div className="stat">
            <span className="stat-value">{data.total_attempts}</span>
            <span className="stat-label">Попыток</span>
          </div>
          <div className="stat">
            <span className="stat-value">{data.average_score.toFixed(0)}%</span>
            <span className="stat-label">Средний балл</span>
          </div>
        </div>
      </div>

      {data.total_attempts === 0 ? (
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</p>
          <h3>Пока нет данных</h3>
          <p style={{ color: '#64748b' }}>Аналитика появится после прохождения тестов студентами</p>
        </div>
      ) : (
        <>
          {/* Test tabs */}
          <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {tests.map(test => (
              <button
                key={test}
                onClick={() => { setSelectedTest(test); setSelectedStudent(null) }}
                style={{
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  border: selectedTest === test ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: selectedTest === test ? '#eef2ff' : '#f8fafc',
                  color: selectedTest === test ? '#4f46e5' : '#475569',
                  cursor: 'pointer',
                  fontWeight: selectedTest === test ? '600' : '500',
                }}
              >
                📋 {test}
              </button>
            ))}
          </div>

          {/* Student list for selected test */}
          {selectedTest && !selectedStudent && (
            <div className="content-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem' }}>👥 Результаты студентов в тесте "{selectedTest}"</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {currentTestAttempts.length === 0 ? (
                  <p style={{ color: '#94a3b8' }}>Нет результатов для этого теста</p>
                ) : (
                  currentTestAttempts.map((attempt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedStudent(attempt.student_name)}
                      style={{
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${scoreColor(attempt.score)}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.2s',
                        border: 'none',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{attempt.student_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{attempt.student_email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: '700', color: scoreColor(attempt.score) }}>
                          {attempt.score?.toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {new Date(attempt.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Student details for selected student + test */}
          {selectedStudent && currentStudentAttempts.length > 0 && (
            <div className="content-card" style={{ padding: '1.5rem' }}>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  marginBottom: '1rem',
                  padding: 0,
                }}
              >
                ← Назад к студентам
              </button>
              
              <h3 style={{ margin: '0 0 1rem' }}>
                {selectedStudent} — {selectedTest}
              </h3>

              {currentStudentAttempts.map((attempt, i) => (
                <div key={i} style={{ borderTop: i > 0 ? '1px solid #e2e8f0' : 'none', paddingTop: i > 0 ? '1rem' : 0, marginTop: i > 0 ? '1rem' : 0 }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      {new Date(attempt.created_at).toLocaleString('ru-RU')}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: scoreColor(attempt.score), marginTop: '0.3rem' }}>
                      {attempt.score?.toFixed(0)}%
                    </div>
                  </div>
                  
                  {/* Fetch and show feedback/details */}
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    ID попытки: {attempt.attempt_id}
                  </p>
                  <button
                    onClick={() => window.open(`/results/${attempt.attempt_id}`, '_blank')}
                    style={{
                      padding: '0.6rem 1rem',
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    📖 Посмотреть детали
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Problem topics */}
          {data.weak_topics?.length > 0 && (
            <div className="content-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem' }}>🔍 Проблемные темы</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {data.weak_topics.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 1rem', background: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{t.topic}</span>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>❌ {t.error_count} ошибок</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}