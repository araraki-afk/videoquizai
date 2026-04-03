import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/pages.css'

export default function StudentDashboard({ user }) {
  // Изначально списки пустые, ждем данные от сервера
  const [pendingTests, setPendingTests] = useState([])
  const [completedTests, setCompletedTests] = useState([])
  const [stats, setStats] = useState({ avgScore: 0, totalAvailable: 0, totalCompleted: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const token = localStorage.getItem('token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        // 1. Запрашиваем личную статистику и историю (пройденные тесты)
        const analyticsRes = await fetch(`${API_URL}/api/v1/analytics/me`, { headers });
        // 2. Запрашиваем все доступные тесты
        const quizzesRes = await fetch(`${API_URL}/api/v1/quiz`, { headers });

        if (!analyticsRes.ok || !quizzesRes.ok) {
          throw new Error('Не удалось загрузить данные с сервера');
        }

        const analyticsData = await analyticsRes.json();
        const quizzesData = await quizzesRes.json(); // Ожидаем массив всех тестов

        // Обработка данных от бэкенда
        const history = analyticsData.history || [];
        const completedQuizIds = history.map(attempt => attempt.quiz_id);

        // Фильтруем: новые тесты — это те, которых нет в истории попыток
        const pending = quizzesData.filter(quiz => !completedQuizIds.includes(quiz.id));
        
        // Фильтруем: пройденные тесты — берем из истории, добавляем балл
        const completed = quizzesData
          .filter(quiz => completedQuizIds.includes(quiz.id))
          .map(quiz => {
            const attempt = history.find(a => a.quiz_id === quiz.id);
            return { 
              ...quiz, 
              status: 'completed', 
              score: attempt ? attempt.score : 0 
            };
          });

        setPendingTests(pending);
        setCompletedTests(completed);
        
        // Обновляем статистику из данных аналитики
        setStats({
          avgScore: analyticsData.average_score || 0,
          totalAvailable: pending.length,
          totalCompleted: completed.length
        });

      } catch (err) {
        console.error("Ошибка загрузки дашборда:", err);
        setError('Ошибка при загрузке тестов. Проверьте подключение к серверу.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard page-container">
      <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Добро пожаловать, {user?.name || 'Студент'}! 👋</h1>
          <p className="subtitle">Ваша статистика и доступные материалы</p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{stats.totalAvailable}</span>
            <span className="stat-label">Доступно тестов</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.totalCompleted}</span>
            <span className="stat-label">Пройдено</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.avgScore.toFixed(1)}%</span>
            <span className="stat-label">Средний балл</span>
          </div>
        </div>
      </header>

      {/* Секция 1: Доступные тесты для прохождения */}
      <section className="pending-tests" style={{ marginBottom: '3rem' }}>
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 Ваши тесты
          </h2>
        </div>
        
        <div className="tests-grid">
          {pendingTests.length > 0 ? (
            pendingTests.map(test => (
              <TestCard key={test.id} test={test} />
            ))
          ) : (
            <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
              У вас пока нет новых назначенных тестов.
            </div>
          )}
        </div>
      </section>

      {/* Секция 2: Завершенные тесты (только просмотр результатов) */}
      <section className="completed-tests">
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✅ Пройденные тесты
          </h2>
        </div>
        
        <div className="tests-grid">
          {completedTests.length > 0 ? (
            completedTests.map(test => (
              <TestCard key={test.id} test={test} />
            ))
          ) : (
            <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
              Вы еще не прошли ни одного теста.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function TestCard({ test }) {
  const isCompleted = test.status === 'completed';
  const isSuccess = test.score >= 70;

  return (
    <div className="test-card content-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="test-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{test.title}</h3>
        <span 
          style={{ 
            fontSize: '0.8rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '20px',
            background: isCompleted ? '#dcfce7' : '#f1f5f9',
            color: isCompleted ? '#166534' : '#475569',
            fontWeight: '600'
          }}
        >
          {isCompleted ? 'Завершен' : 'Новый'}
        </span>
      </div>
      
      <div className="test-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', flexGrow: 1 }}>
        {test.topic_tag && <span className="subject">🏷️ {test.topic_tag}</span>}
        <span className="questions">📝 {test.questions ? test.questions.length : 0} вопросов</span>
      </div>

      {isCompleted && (
        <div className="test-score" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: '500' }}>
            <span>Результат:</span>
            <span style={{ color: isSuccess ? '#10b981' : '#ef4444' }}>{test.score}%</span>
          </div>
          <div className="score-bar" style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
            <div className="score-fill" style={{ width: `${test.score}%`, height: '100%', background: isSuccess ? '#10b981' : '#ef4444' }}></div>
          </div>
        </div>
      )}

      <div className="test-actions" style={{ marginTop: 'auto' }}>
        {!isCompleted ? (
          <Link 
            to={`/test/${test.id}`} 
            className="btn-generate" 
            style={{ width: '100%', display: 'block', textAlign: 'center', padding: '0.8rem', textDecoration: 'none', margin: 0 }}
          >
            Пройти тест 🚀
          </Link>
        ) : (
          <Link 
            to={`/results/${test.id}`} 
            className="btn-nav btn-back" 
            style={{ width: '100%', display: 'block', textAlign: 'center', padding: '0.8rem', textDecoration: 'none', boxSizing: 'border-box' }}
          >
            Посмотреть результаты
          </Link>
        )}
      </div>
    </div>
  )
}