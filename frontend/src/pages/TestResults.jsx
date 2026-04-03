//TestResults.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/pages.css';

export default function TestResults() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Получаем данные, которые прислал бэкенд после submit_quiz
  // Обычно они передаются через state при навигации: navigate('/results', { state: result })
  const result = location.state || {
    score: 0,
    total: 0,
    correct: 0,
    weak_topics: []
  };

  const isSuccess = result.score >= 70;

  return (
    <div className="page-container">
      <div className="content-card results-container">
        {/* Заголовок с иконкой состояния */}
        <div className="results-header">
          <div className={`result-icon ${isSuccess ? 'success' : 'retry'}`}>
            {isSuccess ? '🎉' : '📚'}
          </div>
          <h2>{isSuccess ? 'Отличный результат!' : 'Нужно немного повторить'}</h2>
          <p className="subtitle">Вы завершили тест по материалу</p>
        </div>

        {/* Секция с основным баллом */}
        <div className="score-display">
          <div className="score-circle">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className={`circle ${isSuccess ? 'success' : 'warning'}`}
                strokeDasharray={`${result.score}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" className="percentage">{result.score}%</text>
            </svg>
          </div>
          <div className="score-details">
            <p>Верно: <strong>{result.correct}</strong> из {result.total}</p>
          </div>
        </div>

        {/* Секция слабых тем (Weak Topics) — данные напрямую из бэкенда */}
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
            <p className="hint">
              Именно по этим темам система выявила ошибки. Рекомендуем пересмотреть соответствующие части видео или конспекта.
            </p>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="results-actions">
          <button className="btn-generate" onClick={() => navigate('/')}>
            На главную
          </button>
          <button className="btn-nav btn-back" onClick={() => navigate(-1)}>
            Пройти еще раз
          </button>
        </div>
      </div>
    </div>
  );
}