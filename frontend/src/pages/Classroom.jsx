import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import '../styles/pages.css'

export default function Classroom({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
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

  // Classroom detail
  const [classroomDetail, setClassroomDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  // Student-facing test list for the current classroom (only populated when
  // viewing /classroom/:id as a student).
  const [studentContent, setStudentContent] = useState([])
  const [studentContentLoading, setStudentContentLoading] = useState(false)

  // Assign content
  const [assigningClassroomId, setAssigningClassroomId] = useState(null)
  const [myContent, setMyContent] = useState([])
  const [selectedContentId, setSelectedContentId] = useState('')
  const [assignDifficulty, setAssignDifficulty] = useState('medium')
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [assignDeadline, setAssignDeadline] = useState('')

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

  useEffect(() => {
    if (id) {
      const fetchDetail = async () => {
        setDetailLoading(true)
        try {
          const res = await fetch(`${API_URL}/api/v1/classroom/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) setClassroomDetail(await res.json())
        } catch (err) {
          // fall back to basic info
        } finally {
          setDetailLoading(false)
        }
      }
      fetchDetail()
    }
  }, [id])

  // When a student opens a classroom, pull the actionable test list so we
  // can render "Take test" buttons inline (issue #2). Skipped for teachers
  // because they get the management/analytics surface already.
  useEffect(() => {
    if (!id || isTeacher) {
      setStudentContent([])
      return
    }
    const fetchStudentContent = async () => {
      setStudentContentLoading(true)
      try {
        const res = await fetch(`${API_URL}/api/v1/classroom/${id}/content-for-student`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setStudentContent(await res.json())
      } catch (err) {
        // ignore; empty list will render the placeholder
      } finally {
        setStudentContentLoading(false)
      }
    }
    fetchStudentContent()
  }, [id, isTeacher])

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
      const payload = {
        content_id: Number(selectedContentId),
        quiz_difficulty: assignDifficulty,
        max_attempts: maxAttempts,
      }
      if (assignDeadline) payload.deadline = new Date(assignDeadline).toISOString()
      const res = await fetch(`${API_URL}/api/v1/classroom/${classroomId}/assign-content`, {
        method: 'POST', headers,
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка')
      setAssigningClassroomId(null)
      setSelectedContentId('')
      setAssignDifficulty('medium')
      setMaxAttempts(3)
      setAssignDeadline('')
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

  // DETAIL VIEW: Show when /classroom/:id
  if (id) {
    const classroom = classrooms.find(c => c.id === parseInt(id))
    if (!classroom) {
      return (
        <div className="page-container">
          <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>Группа не найдена</h2>
            <button className="btn-generate" onClick={() => navigate('/classroom')}>Вернуться</button>
          </div>
        </div>
      )
    }

    const detail = classroomDetail
    const studentMembers = detail?.members?.filter(m => m.role === 'student') || []
    const teacherMembers = detail?.members?.filter(m => m.role === 'teacher') || []
    const contents = detail?.contents || []

    return (
      <div className="page-container">
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => navigate('/classroom')} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 }}>
            ← Назад к управлению группами
          </button>
          <h1>{classroom.name}</h1>
          {classroom.description && (
            <p style={{ color: '#64748b', marginTop: '0.3rem', fontSize: '1rem' }}>{classroom.description}</p>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="content-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#4f46e5' }}>{studentMembers.length}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Студентов</div>
          </div>
          <div className="content-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>{contents.length}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Материалов</div>
          </div>
          <div className="content-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#475569', letterSpacing: '1px' }}>{classroom.invite_code}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Код приглашения</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {isTeacher && (
            <>
              <Link to={`/classroom/${classroom.id}/analytics`} className="btn-generate" style={{ textDecoration: 'none', width: 'auto', padding: '0.8rem 1.5rem', margin: 0 }}>
                📊 Аналитика группы
              </Link>
              <button onClick={() => navigate('/classroom')} className="btn-nav btn-back">
                ✏️ Управление
              </button>
            </>
          )}
        </div>

        {detailLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '2rem', height: '2rem' }}></div>
          </div>
        ) : detail ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Members */}
            <div className="content-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>👥 Участники ({detail.members?.length || 0})</h3>
              {teacherMembers.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Преподаватели</div>
                  {teacherMembers.map(m => (
                    <div key={m.id} style={{ padding: '0.6rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '0.9rem' }}>{m.full_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{m.email}</div>
                      </div>
                      <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>Преподаватель</span>
                    </div>
                  ))}
                </div>
              )}
              {studentMembers.length > 0 ? (
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Студенты</div>
                  {studentMembers.map(m => (
                    <div key={m.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '0.9rem' }}>{m.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{m.email}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Студенты пока не присоединились</p>
              )}
            </div>

            {/* Assigned Content / Takeable tests */}
            <div className="content-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
                📚 {isTeacher ? `Назначенные материалы (${contents.length})` : `Тесты этой группы`}
              </h3>

              {/* Teacher view: read-only list (analytics has more detail) */}
              {isTeacher && (
                contents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {contents.map(c => (
                      <div key={c.id} style={{ padding: '0.8rem', background: '#f8fafc', borderRadius: '8px', borderLeft: `3px solid ${c.content_status === 'done' ? '#10b981' : '#f59e0b'}` }}>
                        <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '0.9rem' }}>{c.content_title}</div>
                        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.4rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                          <span>{c.quiz_difficulty === 'easy' ? '🟢 Лёгкий' : c.quiz_difficulty === 'hard' ? '🔴 Сложный' : '🟡 Средний'}</span>
                          {c.max_attempts != null && <span>🔄 {c.max_attempts === 0 ? '∞' : c.max_attempts} попыток</span>}
                          {c.deadline && <span>⏰ до {new Date(c.deadline).toLocaleString('ru-RU')}</span>}
                          <span>📅 {new Date(c.assigned_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Материалы ещё не назначены</p>
                )
              )}

              {/* Student view: clickable test cards (issue #2) */}
              {!isTeacher && (
                studentContentLoading ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Загрузка…</p>
                ) : studentContent.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Преподаватель ещё не назначил материалов.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {studentContent.map(item => {
                      const quiz = item.quizzes && item.quizzes[0]
                      const limitReached = quiz && quiz.max_attempts != null && quiz.used_attempts >= quiz.max_attempts
                      const deadlinePassed = item.deadline && new Date(item.deadline) < new Date()
                      return (
                        <div key={item.content_id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', borderLeft: '3px solid #4f46e5' }}>
                          <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.95rem', marginBottom: '0.3rem' }}>{item.title}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem' }}>
                            <span>{item.quiz_difficulty === 'easy' ? '🟢 Лёгкий' : item.quiz_difficulty === 'hard' ? '🔴 Сложный' : '🟡 Средний'}</span>
                            {quiz && <span>📋 {quiz.question_count} вопросов</span>}
                            {quiz && quiz.max_attempts != null && (
                              <span style={{ color: limitReached ? '#ef4444' : '#f59e0b' }}>
                                🔄 {quiz.used_attempts}/{quiz.max_attempts}
                              </span>
                            )}
                            {item.deadline && (
                              <span style={{ color: deadlinePassed ? '#ef4444' : '#475569' }}>
                                ⏰ до {new Date(item.deadline).toLocaleString('ru-RU')}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Link to={`/content/${item.content_id}`} className="btn-nav btn-back" style={{ textDecoration: 'none', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}>
                              📖 Конспект
                            </Link>
                            {quiz ? (
                              limitReached || deadlinePassed ? (
                                <span style={{ padding: '0.5rem 0.9rem', background: '#f1f5f9', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>
                                  {deadlinePassed ? '⌛ Срок истёк' : '🚫 Лимит исчерпан'}
                                </span>
                              ) : (
                                <Link to={`/test/${quiz.id}`} className="btn-generate" style={{ width: 'auto', padding: '0.5rem 1rem', textDecoration: 'none', margin: 0, fontSize: '0.85rem' }}>
                                  Пройти тест 🚀
                                </Link>
                              )
                            ) : (
                              <span style={{ padding: '0.5rem 0.9rem', background: '#fffbeb', borderRadius: '8px', color: '#f59e0b', fontSize: '0.85rem' }}>
                                Тест готовится…
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  // MANAGEMENT VIEW: Show when /classroom (no :id)

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
          classrooms.map(cls => {
            // Students get a fully-clickable card that drops them into the
            // classroom detail view (where they see the test list).
            // Teachers keep the multi-button management card.
            const cardInner = (
              <>
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

                {isTeacher ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                    <button
                      className="btn-nav btn-next"
                      style={{ flex: 1, fontSize: '0.85rem', padding: '0.6rem' }}
                      onClick={() => { setAssigningClassroomId(cls.id); fetchMyContent() }}
                    >
                      📄 Назначить материал
                    </button>
                    <Link
                      to={`/classroom/${cls.id}/analytics`}
                      className="btn-nav btn-back"
                      style={{ flex: 1, fontSize: '0.85rem', padding: '0.6rem', textAlign: 'center', textDecoration: 'none' }}
                    >
                      📊 Аналитика
                    </Link>
                  </div>
                ) : (
                  <div style={{ color: '#4f46e5', fontSize: '0.85rem', fontWeight: '500', marginTop: 'auto' }}>
                    📚 Открыть тесты группы →
                  </div>
                )}
              </>
            )

            if (!isTeacher) {
              return (
                <Link
                  key={cls.id}
                  to={`/classroom/${cls.id}`}
                  className="content-card"
                  style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                >
                  {cardInner}
                </Link>
              )
            }
            return (
              <div key={cls.id} className="content-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                {cardInner}
              </div>
            )
          })
        ) : (
          <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b', gridColumn: '1 / -1', textAlign: 'center' }}>
            {isTeacher ? 'Нет созданных классов. Создайте первый!' : 'Вы пока не состоите ни в одной группе. Присоединитесь по коду!'}
          </div>
        )}
      </div>

      {/* Assign-content modal — rendered once at the page level so opening
          it never reflows the classroom grid (fixes issue #4). */}
      {assigningClassroomId !== null && (() => {
        const cls = classrooms.find(c => c.id === assigningClassroomId)
        if (!cls) return null
        const close = () => {
          setAssigningClassroomId(null)
          setSelectedContentId('')
          setAssignDifficulty('medium')
          setMaxAttempts(3)
          setAssignDeadline('')
        }
        return (
          <div className="vq-modal-backdrop" onClick={close}>
            <div className="vq-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Назначить материал</h3>
              <p className="vq-modal-subtitle">Группа «{cls.name}»</p>

              {myContent.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  Нет готовых материалов. <Link to="/create-test" style={{ color: '#4f46e5' }}>Создайте тест</Link>
                </p>
              ) : (
                <>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>Материал</label>
                  <select value={selectedContentId} onChange={(e) => setSelectedContentId(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    <option value="">Выберите материал…</option>
                    {myContent.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>

                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>Сложность</label>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                    {['easy', 'medium', 'hard'].map(d => (
                      <button key={d} type="button"
                        className={`difficulty-btn ${assignDifficulty === d ? 'active' : ''} difficulty-${d}`}
                        onClick={() => setAssignDifficulty(d)}
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d === 'easy' ? 'Лёгкий' : d === 'medium' ? 'Средний' : 'Сложный'}
                      </button>
                    ))}
                  </div>

                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>
                    Количество попыток: <strong>{maxAttempts === 0 ? '∞' : maxAttempts}</strong>
                  </label>
                  <input type="range" min="1" max="10" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    style={{ width: '100%', marginBottom: '0.4rem' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
                    <span>1</span><span>5</span><span>10</span>
                  </div>

                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>Дедлайн (необязательно)</label>
                  <input type="datetime-local" value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />

                  <div className="vq-modal-actions">
                    <button onClick={close}
                      style={{ padding: '0.7rem 1.2rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                      Отмена
                    </button>
                    <button onClick={() => handleAssign(cls.id)} disabled={!selectedContentId || isSubmitting}
                      style={{ padding: '0.7rem 1.2rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                      {isSubmitting ? 'Назначаю…' : 'Назначить'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}