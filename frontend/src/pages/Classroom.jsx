import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/pages.css'

export default function Classroom({ user }) {
  const [classrooms, setClassrooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Create classroom
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Join classroom
  const [isJoining, setIsJoining] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joinMsg, setJoinMsg] = useState('')

  // Assign content
  const [assigningClassroomId, setAssigningClassroomId] = useState(null)
  const [myContent, setMyContent] = useState([])
  const [selectedContentId, setSelectedContentId] = useState('')
  const [assignDifficulty, setAssignDifficulty] = useState('medium')
  const [maxAttempts, setMaxAttempts] = useState(3)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const token = localStorage.getItem('token')
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  const isTeacher = user?.role === 'teacher'

  const fetchClassrooms = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/classroom/my`, { headers })
      if (res.ok) setClassrooms(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMyContent = async () => {
    const res = await fetch(`${API_URL}/api/v1/content/my`, { headers })
    if (res.ok) {
      const data = await res.json()
      setMyContent(data.filter(c => c.status === 'done'))
    }
  }

  useEffect(() => { fetchClassrooms() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/classroom/create`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: newName, description: newDesc })
      })
      if (!res.ok) throw new Error('Не удалось создать группу')
      setNewName(''); setNewDesc(''); setIsCreating(false)
      fetchClassrooms()
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setIsSubmitting(true); setJoinMsg(''); setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/classroom/join`, {
        method: 'POST', headers,
        body: JSON.stringify({ invite_code: inviteCode.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка')
      setJoinMsg(`Вы присоединились к группе «${data.classroom_name}»!`)
      setInviteCode(''); setIsJoining(false)
      fetchClassrooms()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssign = async (classroomId) => {
    if (!selectedContentId) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/classroom/${classroomId}/assign-content`, {
        method: 'POST', headers,
        body: JSON.stringify({
          content_id: Number(selectedContentId),
          quiz_difficulty: assignDifficulty,
          max_attempts: maxAttempts
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка')
      setAssigningClassroomId(null); setSelectedContentId(''); setAssignDifficulty('medium'); setMaxAttempts(3)
      alert('Материал назначен!')
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading && classrooms.length === 0) {
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
          <h1>{isTeacher ? 'Ваши классы 👨‍🏫' : 'Ваши группы 👥'}</h1>
          <p className="subtitle" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {isTeacher ? 'Управляйте группами и назначайте материалы' : 'Группы, в которых вы состоите'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isTeacher && !isCreating && (
            <button className="btn-generate" style={{ width: 'auto', padding: '0.7rem 1.2rem', margin: 0 }} onClick={() => setIsCreating(true)}>
              + Создать класс
            </button>
          )}
          {!isTeacher && !isJoining && (
            <button className="btn-generate" style={{ width: 'auto', padding: '0.7rem 1.2rem', margin: 0 }} onClick={() => setIsJoining(true)}>
              🔑 Присоединиться
            </button>
          )}
        </div>
      </header>

      {error && <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', marginBottom: '1.5rem' }}>{error}</div>}
      {joinMsg && <div style={{ padding: '1rem', background: '#ecfdf5', color: '#166534', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '500' }}>{joinMsg}</div>}

      {/* Join form */}
      {isJoining && (
        <div className="content-card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #cbd5e1', background: '#f8fafc' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Присоединиться к группе</h3>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Введите код-приглашение" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required
              style={{ flex: 1, minWidth: '200px', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />
            <button type="submit" disabled={isSubmitting} style={{ padding: '0.8rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              {isSubmitting ? '...' : 'Присоединиться'}
            </button>
            <button type="button" onClick={() => setIsJoining(false)} style={{ padding: '0.8rem 1.5rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Отмена
            </button>
          </form>
        </div>
      )}

      {/* Create form */}
      {isCreating && (
        <div className="content-card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #cbd5e1', background: '#f8fafc' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Создание нового класса</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder="Название класса" value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />
            <input type="text" placeholder="Описание (необязательно)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" disabled={isSubmitting} style={{ padding: '0.8rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isSubmitting ? 'Создание...' : 'Сохранить'}
              </button>
              <button type="button" onClick={() => setIsCreating(false)} style={{ padding: '0.8rem 1.5rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classrooms list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {classrooms.length > 0 ? (
          classrooms.map(cls => (
            <div key={cls.id} className="content-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{cls.name}</h3>
                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {cls.member_count || 0} уч.
                </span>
              </div>

              {cls.description && (
                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>{cls.description}</p>
              )}

              {isTeacher && (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Код: <strong style={{ color: '#475569', letterSpacing: '1px' }}>{cls.invite_code}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                {isTeacher && (
                  <>
                    <button className="btn-nav btn-next" style={{ flex: 1, fontSize: '0.85rem', padding: '0.6rem' }} onClick={() => { setAssigningClassroomId(cls.id); fetchMyContent() }}>
                      📄 Назначить материал
                    </button>
                    <Link to={`/classroom/${cls.id}/analytics`} className="btn-nav btn-back" style={{ flex: 1, fontSize: '0.85rem', padding: '0.6rem', textAlign: 'center', textDecoration: 'none' }}>
                      📊 Аналитика
                    </Link>
                  </>
                )}
              </div>

              {/* Assign content panel */}
              {assigningClassroomId === cls.id && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.95rem' }}>Назначить материал в «{cls.name}»</h4>

                  {myContent.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Нет готовых материалов. <Link to="/create-test" style={{ color: '#4f46e5' }}>Создайте тест</Link></p>
                  ) : (
                    <>
                      <select value={selectedContentId} onChange={(e) => setSelectedContentId(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.8rem', fontSize: '0.9rem' }}>
                        <option value="">Выберите материал...</option>
                        {myContent.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>

                      <div style={{ marginBottom: '0.8rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>Сложность</label>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {['easy', 'medium', 'hard'].map(d => (
                            <button key={d} type="button"
                              className={`difficulty-btn ${assignDifficulty === d ? 'active' : ''} difficulty-${d}`}
                              onClick={() => setAssignDifficulty(d)}
                              style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                            >
                              {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d === 'easy' ? 'Лёгкий' : d === 'medium' ? 'Средний' : 'Сложный'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '0.8rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>Количество попыток: <strong>{maxAttempts === 0 ? '∞' : maxAttempts}</strong></label>
                        <input type="range" min="1" max="10" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}
                          style={{ width: '100%', marginBottom: '0.4rem' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                          <span>1</span><span>5</span><span>10</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleAssign(cls.id)} disabled={!selectedContentId || isSubmitting}
                          style={{ padding: '0.6rem 1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                          {isSubmitting ? '...' : 'Назначить'}
                        </button>
                        <button onClick={() => setAssigningClassroomId(null)}
                          style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          Отмена
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b', gridColumn: '1 / -1', textAlign: 'center' }}>
            {isTeacher ? 'Нет созданных классов. Создайте первый!' : 'Вы пока не состоите ни в одной группе. Присоединитесь по коду!'}
          </div>
        )}
      </div>
    </div>
  )
}