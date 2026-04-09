import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/pages.css';

export default function ClassroomAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/classroom/${id}/analytics`, { headers });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Ошибка загрузки аналитики');
        }
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</p>
          <h2>Ошибка загрузки аналитики</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>{error}</p>
          <button className="btn-generate" style={{ maxWidth: '300px', margin: '0 auto' }} onClick={() => navigate(-1)}>Назад</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { classroom_name, total_students, total_attempts, average_score, attempts, weak_topics, score_distribution } = data;

  // Group attempts by student
  const byStudent = {};
  for (const a of attempts) {
    if (!byStudent[a.student_id]) {
      byStudent[a.student_id] = { name: a.student_name, email: a.student_email, attempts: [] };
    }
    byStudent[a.student_id].attempts.push(a);
  }

  const scoreColor = (s) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '0.3rem', padding: 0 }}>
            ← Назад к группам
          </button>
          <h1>📊 Аналитика: {classroom_name}</h1>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{total_students}</span>
            <span className="stat-label">Студентов</span>
          </div>
          <div className="stat">
            <span className="stat-value">{total_attempts}</span>
            <span className="stat-label">Попыток</span>
          </div>
          <div className="stat">
            <span className="stat-value">{average_score.toFixed(0)}%</span>
            <span className="stat-label">Средний балл</span>
          </div>
        </div>
      </div>

      {/* No data yet */}
      {total_attempts === 0 && (
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</p>
          <h3>Пока нет данных</h3>
          <p style={{ color: '#64748b' }}>Аналитика появится после того, как студенты начнут проходить тесты.</p>
        </div>
      )}

      {total_attempts > 0 && (
        <>
          {/* Score distribution */}
          <div className="content-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>📈 Распределение баллов</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { key: '70-100', label: '70–100% (отлично)', color: '#10b981', bg: '#ecfdf5' },
                { key: '40-70', label: '40–70% (средне)', color: '#f59e0b', bg: '#fffbeb' },
                { key: '0-40', label: '0–40% (слабо)', color: '#ef4444', bg: '#fef2f2' },
              ].map(b => (
                <div key={b.key} style={{ flex: 1, minWidth: '140px', padding: '1.5rem', borderRadius: '12px', background: b.bg, textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: b.color }}>{score_distribution[b.key] || 0}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak topics */}
          {weak_topics.length > 0 && (
            <div className="content-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem' }}>🔍 Проблемные темы</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>Темы, в которых студенты чаще всего допускают ошибки</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {weak_topics.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{t.topic}</span>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span>❌ {t.error_count} ошибок</span>
                      <span>👤 {t.student_count} студентов</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-student breakdown */}
          <div className="content-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>👥 Результаты по студентам</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(byStudent).map(([sid, student]) => {
                const bestScore = Math.max(...student.attempts.map(a => a.score || 0));
                return (
                  <div key={sid} style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: '12px', borderLeft: `4px solid ${scoreColor(bestScore)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '1.05rem' }}>{student.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{student.email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: scoreColor(bestScore) }}>{bestScore.toFixed(0)}%</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>лучший результат</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem' }}>
                      {student.attempts.map(a => (
                        <div key={a.attempt_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', padding: '0.4rem 0' }}>
                          <span style={{ flex: 1 }}>{a.quiz_title}</span>
                          <span style={{ color: scoreColor(a.score), fontWeight: '600', marginRight: '1.5rem' }}>{(a.score || 0).toFixed(0)}%</span>
                          <span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}