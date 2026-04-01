import { useParams, useNavigate, Link } from 'react-router-dom'
import '../styles/pages.css'

export default function TestResults() {
  const { id } = useParams()
  const navigate = useNavigate()

  const resultData = {
    testName: 'Math Basics - Final Exam',
    score: 85,
    maxScore: 100,
    totalQuestions: 5,
    answeredCorrectly: 4,
    percentage: 85,
    timeTaken: '18:45',
    grade: 'A',
    answers: [
      { id: 1, question: 'What is 5 + 3?', your: 'B', correct: 'B', status: 'correct' },
      { id: 2, question: 'Which of the following is a prime number?', your: 'C', correct: 'B', status: 'incorrect' },
      { id: 3, question: 'What is the capital of France?', your: 'C', correct: 'C', status: 'correct' },
      { id: 4, question: 'True or False: The Earth is flat', your: 'False', correct: 'False', status: 'correct' },
      { id: 5, question: 'Describe the water cycle in 100 words', your: 'Good answer', correct: 'Full marks', status: 'correct' }
    ]
  }

  const getGradeColor = (grade) => {
    const colors = {
      'A': '#22c55e',
      'B': '#3b82f6',
      'C': '#f59e0b',
      'D': '#ef4444'
    }
    return colors[grade] || '#6b7280'
  }

  return (
    <div className="results-container">
      <header className="results-header">
        <h1>Test Results</h1>
        <p>{resultData.testName}</p>
      </header>

      <div className="results-summary">
        <div className="score-circle">
          <div className="score-content">
            <span className="score-number">{resultData.percentage}%</span>
            <span className="score-label">Score</span>
          </div>
        </div>

        <div className="results-details">
          <div className="detail-item">
            <span className="detail-label">Grade</span>
            <span className="detail-value" style={{ color: getGradeColor(resultData.grade) }}>
              {resultData.grade}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Correct Answers</span>
            <span className="detail-value">{resultData.answeredCorrectly}/{resultData.totalQuestions}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Time Taken</span>
            <span className="detail-value">{resultData.timeTaken}</span>
          </div>
        </div>

        <div className="results-actions">
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Back to Dashboard
          </button>
          <button onClick={() => navigate(`/test/${id}`)} className="btn btn-outline">
            Retake Test
          </button>
        </div>
      </div>

      <section className="detailed-results">
        <h2>Detailed Answers</h2>

        <div className="answers-list">
          {resultData.answers.map((answer, idx) => (
            <div key={answer.id} className={`answer-item answer-${answer.status}`}>
              <div className="answer-number">
                <span>{answer.id}</span>
                {answer.status === 'correct' ? '✓' : '✗'}
              </div>

              <div className="answer-content">
                <p className="answer-question">{answer.question}</p>
                
                <div className="answer-comparison">
                  <div className="answer-your">
                    <span className="label">Your Answer:</span>
                    <span className="answer-text">{answer.your}</span>
                  </div>
                  {answer.status === 'incorrect' && (
                    <div className="answer-correct">
                      <span className="label">Correct Answer:</span>
                      <span className="answer-text">{answer.correct}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="performance-insights">
        <h2>Performance Insights</h2>

        <div className="insights-grid">
          <div className="insight-card">
            <h3>✅ Strengths</h3>
            <ul>
              <li>Excellent performance in arithmetic</li>
              <li>Good knowledge of geography</li>
              <li>Well-structured answers</li>
            </ul>
          </div>

          <div className="insight-card">
            <h3>📚 Areas to Improve</h3>
            <ul>
              <li>Review prime numbers concept</li>
              <li>Practice more complex calculations</li>
              <li>Focus on number theory</li>
            </ul>
          </div>

          <div className="insight-card">
            <h3>💡 Recommendations</h3>
            <ul>
              <li>Take the "Number Theory" refresher course</li>
              <li>Practice with similar tests weekly</li>
              <li>Review weak concepts thoroughly</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
