import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuestionCard from './QuestionCard';
import '../styles/pages.css';

export default function TestTaking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchQuiz = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/quiz/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Не удалось загрузить тест');
        }
        const data = await res.json();
        setQuiz(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentStep];
  const progress = questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId.toString()]: value }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitResults();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const submitResults = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/quiz/${quiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
      if (!response.ok) throw new Error('Ошибка при отправке');
      const result = await response.json();
      navigate(`/results/${result.attempt_id}`, { state: result });
    } catch (error) {
      setError('Ошибка при отправке ответов. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="page-container">
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</p>
          <h2 style={{ marginBottom: '1rem' }}>Не удалось загрузить тест</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>{error}</p>
          <button className="btn-generate" style={{ maxWidth: '300px', margin: '0 auto' }} onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  // Instructions screen
  if (!started) {
    return (
      <div className="page-container">
        <div className="content-card" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</p>
          <h2 style={{ marginBottom: '0.5rem' }}>{quiz.title}</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            {questions.length} вопросов • Выберите ответ на каждый вопрос
          </p>

          <div style={{
            background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem',
            textAlign: 'left', lineHeight: '1.8', color: '#475569', fontSize: '0.95rem'
          }}>
            <p>✓ Отвечайте на вопросы последовательно</p>
            <p>✓ Вы можете вернуться к предыдущему вопросу</p>
            <p>✓ После ответа на последний вопрос тест будет отправлен</p>
            <p>✓ Результат и обратная связь будут показаны сразу</p>
          </div>

          <button className="btn-generate" style={{ maxWidth: '300px', margin: '0 auto' }} onClick={() => setStarted(true)}>
            Начать тест 🚀
          </button>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="page-container">
      <div className="content-card">
        {/* Progress bar */}
        <div className="test-progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{quiz.title}</h2>
          <span style={{ color: '#4f46e5', fontWeight: '600', fontSize: '0.95rem' }}>
            {currentStep + 1} / {questions.length}
          </span>
        </div>

        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            currentAnswer={answers[currentQuestion.id.toString()]}
            onAnswerChange={handleAnswerChange}
          />
        )}

        {error && (
          <div style={{ color: '#ef4444', background: '#fef2f2', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div className="test-actions-footer">
          <button
            className="btn-nav btn-back"
            onClick={handlePrev}
            disabled={currentStep === 0 || isSubmitting}
          >
            ← Назад
          </button>

          <button
            className="btn-nav btn-next"
            onClick={handleNext}
            disabled={isSubmitting || !answers[currentQuestion?.id?.toString()]}
          >
            {isSubmitting ? 'Отправка...' :
              currentStep === questions.length - 1 ? 'Завершить тест ✓' : 'Далее →'}
          </button>
        </div>
      </div>
    </div>
  );
}