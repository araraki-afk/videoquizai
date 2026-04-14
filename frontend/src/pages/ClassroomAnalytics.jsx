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
          <button className="btn-generate" onClick={() => navigate(`/classroom/${id}`)}>Назад</button>
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
  const currentTestAttempts = selectedTest ? attemptsByTest[selectedTest] || [] : []

  // Group current test attempts by student
  const studentMap = {}
  currentTestAttempts.forEach(a => {
    if (!studentMap[a.student_name]) {
      studentMap[a.student_name] = {
        name: a.student_name,
        email: a.student_email,
        attempts: [],
      }
    }
    studentMap[a.student_name].attempts.push(a)
  })
  const students = Object.values(studentMap)

  // Get selected student's data
  const selectedStudentData = selectedStudent ? studentMap[selectedStudent] : null

  const scoreColor = (s) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <button onClick={() => navigate(`/classroom/${id}`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '0.3rem', padding: 0 }}>
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
            <span className="stat-value">{tests.length}</span>
            <span className="stat-label">Тестов</span>
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

          {/* Student tabs + content area */}
          {selectedTest && (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Student sidebar tabs */}
              <div style={{ minWidth: '220px', width: '220px', flexShrink: 0 }}
                className="analytics-student-sidebar"
              >
                <div className="content-card" style={{ padding: '0.5rem' }}>
                  <h4 style={{ margin: '0.8rem 0.8rem 0.5rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    👥 Прошли тест ({students.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {students.map(s => {
                      const bestScore = Math.max(...s.attempts.map(a => a.score ?? 0))
                      const isActive = selectedStudent === s.name
                      return (
                        <button
                          key={s.name}
                          onClick={() => setSelectedStudent(isActive ? null : s.name)}
                          style={{
                            padding: '0.7rem 0.8rem',
                            background: isActive ? '#eef2ff' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: 'none',
                            textAlign: 'left',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s',
                            width: '100%',
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? '#eef2ff' : 'transparent' }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: isActive ? '600' : '500', color: isActive ? '#4f46e5' : '#1e293b', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {s.attempts.length} {s.attempts.length === 1 ? 'попытка' : 'попыток'}
                            </div>
                          </div>
                          <span style={{ fontWeight: '700', color: scoreColor(bestScore), fontSize: '0.9rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                            {bestScore.toFixed(0)}%
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Student detail area */}
              <div style={{ flex: 1, minWidth: '280px' }}>
                {!selectedStudent ? (
                  <div className="content-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#94a3b8' }}>Нажмите на студента для просмотра деталей</p>
                  </div>
                ) : selectedStudentData ? (
                  <div className="content-card" style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 0.2rem' }}>{selectedStudentData.name}</h3>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>{selectedStudentData.email}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {selectedStudentData.attempts.map((attempt, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '1rem',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${scoreColor(attempt.score)}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              Попытка {selectedStudentData.attempts.length - i}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              {new Date(attempt.created_at).toLocaleString('ru-RU')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.3rem', fontWeight: '700', color: scoreColor(attempt.score) }}>
                              {attempt.score?.toFixed(0)}%
                            </span>
                            <button
                              onClick={() => window.open(`/results/${attempt.attempt_id}`, '_blank')}
                              style={{
                                padding: '0.5rem 0.8rem',
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                            >
                              📖 Детали
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Problem topics with student count */}
          {data.weak_topics?.length > 0 && (
            <div className="content-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem' }}>🔍 Проблемные темы</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {data.weak_topics.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{t.topic}</span>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>👥 {t.student_count} {t.student_count === 1 ? 'студент' : 'студентов'}</span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>❌ {t.error_count} ошибок</span>
                    </div>
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