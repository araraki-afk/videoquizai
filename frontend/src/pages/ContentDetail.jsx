import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch content status
        const statusRes = await fetch(`${API_URL}/api/v1/content/${id}/status`, { headers });
        if (statusRes.ok) {
          const data = await statusRes.json();
          setContent(data);
        }

        // Fetch summary
        const summaryRes = await fetch(`${API_URL}/api/v1/content/${id}/summary`, { headers });
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data.text);
        }

        // Fetch quizzes for this content
        const quizzesRes = await fetch(`${API_URL}/api/v1/quiz/by-content/${id}`, { headers });
        if (quizzesRes.ok) {
          const data = await quizzesRes.json();
          setQuizzes(data);
        }
      } catch (err) {
        setError('Ошибка при загрузке данных');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', padding: 0, marginBottom: '0.5rem' }}>
              ← Назад
            </button>
            <h2 style={{ margin: 0 }}>📖 Материал #{id}</h2>
          </div>
          {content && (
            <span style={{
              padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600',
              background: content.status === 'done' ? '#ecfdf5' : '#fffbeb',
              color: content.status === 'done' ? '#10b981' : '#f59e0b',
            }}>
              {content.status === 'done' ? 'Готово' : content.status === 'failed' ? 'Ошибка' : 'Обработка...'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', marginBottom: '1.5rem' }}>{error}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
          style={{ flex: 'none', padding: '0.6rem 1.2rem' }}
        >
          📝 Конспект
        </button>
        <button
          className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
          style={{ flex: 'none', padding: '0.6rem 1.2rem' }}
        >
          📋 Тесты ({quizzes.length})
        </button>
      </div>

      {/* Summary tab */}
      {activeTab === 'summary' && (
        <div className="content-card">
          {summary ? (
            <div style={{ lineHeight: '1.8', color: '#334155', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
              {summary}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</p>
              <p>Конспект ещё не готов. Подождите завершения обработки.</p>
            </div>
          )}
        </div>
      )}

      {/* Tests tab */}
      {activeTab === 'tests' && (
        <div>
          {quizzes.length > 0 ? (
            <div className="tests-grid">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="content-card test-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#1e293b' }}>{quiz.title}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    📝 {quiz.questions ? quiz.questions.length : 0} вопросов
                  </p>
                  <Link
                    to={`/test/${quiz.id}`}
                    className="btn-generate"
                    style={{ width: '100%', display: 'block', textAlign: 'center', padding: '0.8rem', textDecoration: 'none', margin: 0 }}
                  >
                    Пройти тест 🚀
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="content-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</p>
              <p>Тестов пока нет. Они появятся после завершения обработки.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}