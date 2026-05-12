import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import '../styles/pages.css'

export default function EditTest() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [contentTitle, setContentTitle] = useState('')
  const [classrooms, setClassrooms] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingQuestionId, setSavingQuestionId] = useState(null)

  // Per-question local edit state. Keyed by question id.
  const [edits, setEdits] = useState({})

  // Assign-to-classrooms modal
  const [showAssign, setShowAssign] = useState(false)
  const [selectedClassroomIds, setSelectedClassroomIds] = useState([])
  const [assignMaxAttempts, setAssignMaxAttempts] = useState(3)
  const [assignDeadline, setAssignDeadline] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const [assignResult, setAssignResult] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const token = localStorage.getItem('token')
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  const refreshQuiz = async () => {
    const res = await fetch(`${API_URL}/api/v1/quiz/${id}/full`, { headers })
    if (!res.ok) throw new Error('Не удалось загрузить тест')
    const data = await res.json()
    setQuiz(data)
    // reset local edits with server values
    const map = {}
    for (const q of data.questions) {
      map[q.id] = {
        text: q.text,
        correct_answer: q.correct_answer,
        options: q.options ? [...q.options] : null,
        topic_tag: q.topic_tag || '',
      }
    }
    setEdits(map)
    return data
  }

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      try {
        const data = await refreshQuiz()
        // Fetch transcript + content title for the editor context panel.
        const [trRes, stRes, crRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/content/${data.content_id}/transcript`, { headers }),
          fetch(`${API_URL}/api/v1/content/${data.content_id}/status`, { headers }),
          fetch(`${API_URL}/api/v1/classroom/my`, { headers }),
        ])
        if (trRes.ok) {
          const t = await trRes.json()
          setTranscript(t.text || '')
        }
        if (stRes.ok) {
          const s = await stRes.json()
          setContentTitle(s.title || '')
        }
        if (crRes.ok) {
          setClassrooms(await crRes.json())
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [id])

  const updateEdit = (qid, patch) => {
    setEdits(prev => ({ ...prev, [qid]: { ...prev[qid], ...patch } }))
  }

  const updateOption = (qid, index, value) => {
    setEdits(prev => {
      const cur = prev[qid] || {}
      const opts = cur.options ? [...cur.options] : []
      opts[index] = value
      return { ...prev, [qid]: { ...cur, options: opts } }
    })
  }

  const addOption = (qid) => {
    setEdits(prev => {
      const cur = prev[qid] || {}
      const opts = cur.options ? [...cur.options, ''] : ['']
      return { ...prev, [qid]: { ...cur, options: opts } }
    })
  }

  const removeOption = (qid, index) => {
    setEdits(prev => {
      const cur = prev[qid] || {}
      const opts = cur.options ? cur.options.filter((_, i) => i !== index) : []
      return { ...prev, [qid]: { ...cur, options: opts } }
    })
  }

  const saveQuestion = async (q) => {
    setSavingQuestionId(q.id)
    try {
      const e = edits[q.id] || {}
      const body = {
        text: e.text,
        correct_answer: e.correct_answer,
        topic_tag: e.topic_tag || null,
      }
      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        body.options = (e.options || []).filter(o => o && o.trim() !== '')
      }
      const res = await fetch(`${API_URL}/api/v1/quiz/questions/${q.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Ошибка сохранения')
      }
      await refreshQuiz()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingQuestionId(null)
    }
  }

  const deleteQuestion = async (q) => {
    if (!confirm('Удалить этот вопрос?')) return
    try {
      const res = await fetch(`${API_URL}/api/v1/quiz/questions/${q.id}`, { method: 'DELETE', headers })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Ошибка удаления')
      }
      await refreshQuiz()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleClassroomSelected = (cid) => {
    setSelectedClassroomIds(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid])
  }

  const submitAssign = async () => {
    if (selectedClassroomIds.length === 0) {
      alert('Выберите хотя бы одну группу')
      return
    }
    setAssignBusy(true)
    setAssignResult(null)
    try {
      const payload = {
        classroom_ids: selectedClassroomIds,
        max_attempts: assignMaxAttempts === 0 ? null : assignMaxAttempts,
      }
      if (assignDeadline) payload.deadline = new Date(assignDeadline).toISOString()

      const res = await fetch(`${API_URL}/api/v1/quiz/${quiz.id}/assign-to-classrooms`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка назначения')
      setAssignResult(data)
    } catch (err) {
      alert(err.message)
    } finally {
      setAssignBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="page-container">
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Не удалось открыть тест</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error}</p>
          <Link to="/drafts" className="btn-generate" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto', padding: '0.7rem 1.5rem', margin: 0 }}>
            ← К черновикам
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/drafts')} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.9rem', padding: 0, marginBottom: '0.5rem' }}>
          ← К черновикам
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>✏️ {quiz.title}</h1>
            <p style={{ color: '#64748b', marginTop: '0.3rem' }}>📖 {contentTitle}</p>
          </div>
          <button
            className="btn-generate"
            style={{ width: 'auto', padding: '0.8rem 1.5rem', margin: 0 }}
            onClick={() => { setShowAssign(true); setAssignResult(null); setSelectedClassroomIds([]) }}
          >
            🎯 Назначить группам
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Questions editor ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {quiz.questions.map((q, idx) => {
            const e = edits[q.id] || {}
            const isMC = q.question_type === 'multiple_choice'
            const isTF = q.question_type === 'true_false'
            return (
              <div key={q.id} className="content-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.5px' }}>
                    ВОПРОС {idx + 1} · {isMC ? 'Выбор ответа' : isTF ? 'Верно/Неверно' : 'Открытый'}
                  </span>
                  <button
                    onClick={() => deleteQuestion(q)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    🗑 Удалить
                  </button>
                </div>

                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', fontWeight: '500', marginBottom: '0.3rem' }}>Текст вопроса</label>
                <textarea
                  value={e.text || ''}
                  onChange={(ev) => updateEdit(q.id, { text: ev.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', marginBottom: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                />

                {(isMC || isTF) && (
                  <>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', fontWeight: '500', marginBottom: '0.3rem' }}>Варианты ответа</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.7rem' }}>
                      {(e.options || []).map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={(e.correct_answer || '') === opt}
                            onChange={() => updateEdit(q.id, { correct_answer: opt })}
                            title="Отметить как правильный"
                          />
                          <input
                            value={opt}
                            onChange={(ev) => updateOption(q.id, i, ev.target.value)}
                            style={{ flex: 1, padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                          />
                          {isMC && (
                            <button
                              onClick={() => removeOption(q.id, i)}
                              style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
                              title="Удалить вариант"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {isMC && (
                      <button
                        onClick={() => addOption(q.id)}
                        style={{ background: '#eef2ff', color: '#4f46e5', border: '1px dashed #c7d2fe', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.7rem' }}
                      >
                        + Добавить вариант
                      </button>
                    )}
                  </>
                )}

                {q.question_type === 'open' && (
                  <>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', fontWeight: '500', marginBottom: '0.3rem' }}>Правильный ответ</label>
                    <input
                      value={e.correct_answer || ''}
                      onChange={(ev) => updateEdit(q.id, { correct_answer: ev.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '0.9rem' }}
                    />
                  </>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    placeholder="Тема (опционально)"
                    value={e.topic_tag || ''}
                    onChange={(ev) => updateEdit(q.id, { topic_tag: ev.target.value })}
                    style={{ flex: 1, minWidth: '160px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                  <button
                    onClick={() => saveQuestion(q)}
                    disabled={savingQuestionId === q.id}
                    style={{ padding: '0.55rem 1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    {savingQuestionId === q.id ? 'Сохраняю…' : '💾 Сохранить'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Context sidebar: transcript ─────────────── */}
        <aside className="content-card" style={{ padding: '1.2rem', position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 2rem)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.05rem' }}>🎬 Источник</h3>
          <p style={{ margin: '0 0 0.8rem', color: '#94a3b8', fontSize: '0.8rem' }}>
            Транскрипт материала. Используется как контекст при редактировании вопросов.
          </p>
          <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '0.9rem', borderRadius: '10px', fontSize: '0.85rem', lineHeight: '1.6', color: '#475569', whiteSpace: 'pre-wrap' }}>
            {transcript ? transcript : <span style={{ color: '#94a3b8' }}>Транскрипт недоступен.</span>}
          </div>
        </aside>
      </div>

      {/* ── Assign-to-classrooms modal ──────────────────── */}
      {showAssign && (
        <div className="vq-modal-backdrop" onClick={() => setShowAssign(false)}>
          <div className="vq-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <h3>🎯 Назначить группам</h3>
            <p className="vq-modal-subtitle">Выберите одну или несколько групп. В каждой создаётся отдельная копия теста — попытки считаются независимо.</p>

            {classrooms.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>У вас пока нет групп. <Link to="/classroom">Создайте</Link></p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto', marginBottom: '1rem' }}>
                  {classrooms.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.7rem', background: selectedClassroomIds.includes(c.id) ? '#eef2ff' : '#f8fafc', borderRadius: '8px', cursor: 'pointer', border: '1px solid', borderColor: selectedClassroomIds.includes(c.id) ? '#c7d2fe' : '#e2e8f0' }}>
                      <input type="checkbox" checked={selectedClassroomIds.includes(c.id)} onChange={() => toggleClassroomSelected(c.id)} />
                      <span style={{ flex: 1, fontWeight: '500', color: '#1e293b' }}>{c.name}</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{c.member_count || 0} уч.</span>
                    </label>
                  ))}
                </div>

                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: '500', marginBottom: '0.3rem' }}>
                  Количество попыток: <strong>{assignMaxAttempts === 0 ? '∞' : assignMaxAttempts}</strong>
                </label>
                <input type="range" min="0" max="10" value={assignMaxAttempts} onChange={(e) => setAssignMaxAttempts(Number(e.target.value))} style={{ width: '100%', marginBottom: '0.3rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
                  <span>∞</span><span>5</span><span>10</span>
                </div>

                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: '500', marginBottom: '0.3rem' }}>Дедлайн (необязательно)</label>
                <input type="datetime-local" value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '1rem' }} />

                {assignResult && (
                  <div style={{ padding: '0.7rem 0.9rem', background: '#ecfdf5', color: '#166534', borderRadius: '8px', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                    Назначено в {assignResult.assigned?.length || 0} групп
                    {assignResult.updated?.length > 0 && `, обновлено в ${assignResult.updated.length}`}.
                  </div>
                )}

                <div className="vq-modal-actions">
                  <button onClick={() => setShowAssign(false)}
                    style={{ padding: '0.65rem 1.1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Закрыть
                  </button>
                  <button onClick={submitAssign} disabled={assignBusy}
                    style={{ padding: '0.65rem 1.1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    {assignBusy ? 'Назначаю…' : 'Назначить'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}