import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/pages.css'

export default function TestDrafts() {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const token = localStorage.getItem('token')
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchDrafts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/quiz/drafts`, { headers })
      if (!res.ok) throw new Error('Не удалось загрузить черновики')
      setDrafts(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchDrafts() }, [])

  const handleDelete = async (draft) => {
    if (!confirm(`Удалить тест «${draft.title}»? Это действие нельзя отменить.`)) return
    try {
      const res = await fetch(`${API_URL}/api/v1/quiz/${draft.id}`, { method: 'DELETE', headers })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Ошибка удаления')
      }
      fetchDrafts()
    } catch (err) {
      alert(err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    )
  }

  return (
    <div className="dashboard page-container">
      <header className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Черновики тестов 📂</h1>
          <p className="subtitle" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Здесь хранятся все сгенерированные тесты. Откройте любой, чтобы отредактировать вопросы или назначить группам.
          </p>
        </div>
        <Link to="/create-test" className="btn-generate" style={{ textDecoration: 'none', width: 'auto', padding: '0.7rem 1.2rem', margin: 0 }}>
          + Создать новый
        </Link>
      </header>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', marginBottom: '1.5rem' }}>{error}</div>
      )}

      {drafts.length === 0 ? (
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</p>
          <h3 style={{ marginBottom: '0.5rem' }}>Черновиков пока нет</h3>
          <p style={{ marginBottom: '1.5rem' }}>Создайте материал — тест сгенерируется автоматически и попадёт сюда.</p>
          <Link to="/create-test" className="btn-generate" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto', padding: '0.8rem 1.5rem', margin: 0 }}>
            ➕ Создать тест
          </Link>
        </div>
      ) : (
        <div className="tests-grid">
          {drafts.map(d => (
            <div key={d.id} className="content-card test-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', flex: 1 }}>{d.title}</h3>
                <span style={{
                  fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px',
                  background: d.is_validated ? '#ecfdf5' : '#fffbeb',
                  color: d.is_validated ? '#10b981' : '#f59e0b',
                  fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '0.5rem'
                }}>
                  {d.is_validated ? 'Готов' : 'Проверка…'}
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                📖 {d.content_title}
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span>📋 {d.question_count} вопросов</span>
                {d.assigned_count > 0 && <span>🎯 назначен в {d.assigned_count} гр.</span>}
                <span>📅 {new Date(d.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                <button
                  className="btn-generate"
                  disabled={!d.is_validated}
                  onClick={() => navigate(`/edit-test/${d.id}`)}
                  style={{ width: 'auto', padding: '0.55rem 1rem', margin: 0, fontSize: '0.85rem', flex: 1, opacity: d.is_validated ? 1 : 0.5, cursor: d.is_validated ? 'pointer' : 'not-allowed' }}
                >
                  ✏️ Редактировать
                </button>
                <button
                  onClick={() => handleDelete(d)}
                  style={{ padding: '0.55rem 0.9rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}