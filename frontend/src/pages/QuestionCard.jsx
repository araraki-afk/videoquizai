import React from 'react';

export default function QuestionCard({ question, currentAnswer, onAnswerChange }) {
  const { text, question_type, options, id } = question;

  return (
    <div className="question-card animate-fadeIn">
      <div className="question-header">
        <span className="topic-badge">{question.topic_tag || 'Общая тема'}</span>
        <span className="type-label">
          {question_type === 'multiple_choice' ? 'Выбор ответа' : 
           question_type === 'true_false' ? 'Верно/Неверно' : 'Открытый вопрос'}
        </span>
      </div>
      
      <h3 className="question-text">{text}</h3>

      <div className="options-container">
        {/* Рендеринг для выбора вариантов (Multiple Choice и True/False) */}
        {(question_type === 'multiple_choice' || question_type === 'true_false') && (
          <div className="radio-group">
            {options.map((option, index) => (
              <label 
                key={index} 
                className={`option-item ${currentAnswer === option ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${id}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => onAnswerChange(id, e.target.value)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        )}

        {/* Рендеринг для открытого вопроса */}
        {question_type === 'open' && (
          <div className="open-answer-group">
            <input
              type="text"
              className="content-input"
              placeholder="Введите ваш ответ здесь..."
              value={currentAnswer || ''}
              onChange={(e) => onAnswerChange(id, e.target.value)}
            />
            <p className="hint">Совет: пишите кратко и по существу (1-3 слова).</p>
          </div>
        )}
      </div>
    </div>
  );
}