import React, { useState } from 'react';
import QuestionCard from './QuestionCard';

export default function TestTaking({ quiz, onFinish }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: answerText }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

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

  const submitResults = async () => {
    setIsSubmitting(true);
    try {
      // Согласно quiz.py бэкенд ожидает POST запрос с телом { answers: { id: text } }
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/quiz/${quiz.id}/submit`, {
        method: 'POST', // Исправлено с GET на POST согласно анализу бэкенда
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
      
      const result = await response.json();
      onFinish(result); // Передаем результат (score, weak_topics) в родительский компонент
    } catch (error) {
      console.error("Ошибка при отправке ответов:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="test-container">
      {/* Прогресс-бар сверху */}
      <div className="test-progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="test-content">
        <div className="test-info-header">
          <h2>{quiz.title}</h2>
          <span className="counter">Вопрос {currentStep + 1} из {questions.length}</span>
        </div>

        <QuestionCard 
          question={currentQuestion} 
          currentAnswer={answers[currentQuestion.id.toString()]}
          onAnswerChange={handleAnswerChange}
        />

        <div className="test-actions">
          <button 
            className="btn btn-outline" 
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0 || isSubmitting}
          >
            Назад
          </button>
          
          <button 
            className="btn-generate" 
            style={{ width: 'auto', padding: '0.8rem 2.5rem' }}
            onClick={handleNext}
            disabled={isSubmitting || !answers[currentQuestion.id.toString()]}
          >
            {isSubmitting ? 'Проверка...' : 
             currentStep === questions.length - 1 ? 'Завершить тест' : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  );
}