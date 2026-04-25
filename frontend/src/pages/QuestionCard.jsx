import React from 'react';

export default function QuestionCard({ question, currentAnswer, onAnswerChange }) {
  const { text, question_type, id } = question;

  // For true_false, ensure we always have options even if the LLM didn't generate them
  let options = question.options;
  if (question_type === 'true_false' && (!options || options.length === 0)) {
    options = ['Верно', 'Неверно'];
  }

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
        {(question_type === 'multiple_choice' || question_type === 'true_false') && options && options.length > 0 && (
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

        {question_type === 'open' && (
          <div className="open-answer-group">
            <input
              type="text"
              className="content-input"
              placeholder="Введите ваш ответ здесь..."
              value={currentAnswer || ''}
              onChange={(e) => onAnswerChange(id, e.target.value)}
            />
            <p className="hint">Совет: пишите по существу.</p>
          </div>
        )}
      </div>
    </div>
  );
}