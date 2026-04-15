import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import '../styles/pages.css';

export default function TestResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [result, setResult] = useState(location.state || null);
  const [isLoading, setIsLoading] = useState(!location.state);
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isTeacher = currentUser.role === 'teacher';
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (isTeacher || !result || !result.quiz_id) return;

    const checkAttempts = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/v1/quiz/${result.quiz_id}/check-attempt`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCanRetry(data.unlimited || data.remaining > 0);
        }
      } catch (err) {
        console.error("Failed to fetch remaining attempts", err);
      }
    };
    checkAttempts();
  }, [result, isTeacher]);

  useEffect(() => {
    if (location.state) return; // already have data

    const fetchAttempt = async () => {
      setIsLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/v1/quiz/attempts/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Не удалось загрузить результаты');
        const data = await res.json();
        setResult({
          quiz_id: data.quiz_id,
          score: data.score || 0,
          total: 0,
          correct: 0,
          weak_topics: [],
          feedback: data.feedback,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttempt();
  }, [id, location.state]);

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="page-container">
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Не удалось загрузить результаты</h2>
          <p style={{ color: '#64748b' }}>{error}</p>
          <button className="btn-generate" style={{ maxWidth: '300px', margin: '1rem auto 0' }} onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  const isSuccess = result.score >= 70;

  return (
    <div className="page-container">
      <div className="content-card results-container">
        <div className="results-header">
          <div className={`result-icon ${isSuccess ? 'success' : 'retry'}`}>
            {isSuccess ? '🎉' : '📚'}
          </div>
          <h2>{isSuccess ? 'Отличный результат!' : 'Нужно немного повторить'}</h2>
          <p className="subtitle">Вы завершили тест</p>
        </div>

        <div className="score-display">
          <div className="score-circle">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path
                className={`circle ${isSuccess ? 'success' : 'warning'}`}
                strokeDasharray={`${result.score}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" className="percentage">{Math.round(result.score)}%</text>
            </svg>
          </div>
          {result.total > 0 && (
            <div className="score-details">
              <p>Верно: <strong>{result.correct}</strong> из {result.total}</p>
            </div>
          )}
        </div>

        {/* Weak topics */}
        {result.weak_topics && result.weak_topics.length > 0 && (
          <div className="weak-topics-section">
            <h3>🔍 Темы для повторения:</h3>
            <div className="topics-grid">
              {result.weak_topics.map((topic, index) => (
                <div key={index} className="topic-tag-item">
                  <span className="bullet">•</span> {topic}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {result.feedback && (
          <div style={{ textAlign: 'left', marginTop: '1.5rem' }}>
            {result.feedback.overall_summary && (
              <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', marginBottom: '1rem', lineHeight: '1.6', color: '#475569' }}>
                <strong style={{ color: '#1e293b' }}>Общий итог:</strong> {result.feedback.overall_summary}
              </div>
            )}
            {result.feedback.strengths && result.feedback.strengths.length > 0 && (
              <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                <strong style={{ color: '#166534' }}>💪 Сильные стороны:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.2rem', color: '#475569' }}>
                  {result.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {result.feedback.recommendations && result.feedback.recommendations.length > 0 && (
              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '12px' }}>
                <strong style={{ color: '#1e40af' }}>📌 Рекомендации:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.2rem', color: '#475569' }}>
                  {result.feedback.recommendations.map((r, i) => (
                    <li key={i}><strong>{r.topic}:</strong> {r.action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="results-actions">
          <button className="btn-generate" onClick={() => navigate('/')}>
            На главную
          </button>
          
          {/* Conditionally render the retry button */}
          {!isTeacher && canRetry && (
            <button className="btn-nav btn-back" onClick={() => navigate(-1)}>
              Пройти ещё раз
            </button>
          )}
        </div>
      </div>
    </div>
  );
}