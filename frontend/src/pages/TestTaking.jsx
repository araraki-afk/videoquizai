import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/pages.css'

export default function TestTaking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(1800) // 30 minutes
  const [testStarted, setTestStarted] = useState(false)

  const questions = [
    {
      id: 1,
      question: 'What is 5 + 3?',
      type: 'multiple-choice',
      options: ['4', '8', '7', '9'],
      correctAnswer: 1
    },
    {
      id: 2,
      question: 'Which of the following is a prime number?',
      type: 'multiple-choice',
      options: ['8', '11', '12', '14'],
      correctAnswer: 1
    },
    {
      id: 3,
      question: 'What is the capital of France?',
      type: 'multiple-choice',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2
    },
    {
      id: 4,
      question: 'True or False: The Earth is flat',
      type: 'true-false',
      correctAnswer: 0
    },
    {
      id: 5,
      question: 'Describe the water cycle in 100 words',
      type: 'short-answer',
      correctAnswer: null
    }
  ]

  // Timer
  useEffect(() => {
    if (!testStarted) return
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          handleSubmitTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [testStarted])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const handleAnswerChange = (value) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: value
    }))
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleSubmitTest = () => {
    navigate(`/results/${id}`)
  }

  if (!testStarted) {
    return (
      <div className="test-instructions">
        <div className="instructions-card">
          <h1>Test Instructions</h1>
          
          <div className="instructions-content">
            <h2>Math Basics - Final Exam</h2>
            <p className="test-description">
              This test contains 5 questions covering basic mathematics concepts.
              You have 30 minutes to complete it.
            </p>

            <div className="instructions-list">
              <h3>Rules:</h3>
              <ul>
                <li>You have 30 minutes to complete the entire test</li>
                <li>Once submitted, you cannot modify your answers</li>
                <li>All questions are mandatory</li>
                <li>Questions may have different formats (Multiple Choice, True/False, Short Answer)</li>
                <li>Ensure you have a stable internet connection throughout the test</li>
              </ul>
            </div>

            <div className="instructions-info">
              <p><strong>Total Questions:</strong> {questions.length}</p>
              <p><strong>Time Limit:</strong> 30 minutes</p>
              <p><strong>Passing Score:</strong> 60%</p>
            </div>

            <div className="instructions-actions">
              <button 
                onClick={() => setTestStarted(true)}
                className="btn btn-primary btn-large"
              >
                Start Test
              </button>
              <button 
                onClick={() => navigate('/')}
                className="btn btn-outline btn-large"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]

  return (
    <div className="test-container">
      <div className="test-header">
        <div className="test-progress">
          <h2>Question {currentQuestion + 1} of {questions.length}</h2>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}></div>
          </div>
        </div>

        <div className="test-timer">
          <span className="timer-label">Time Remaining:</span>
          <span className={`timer-value ${timeLeft < 300 ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div className="test-content">
        <div className="question-sidebar">
          <h4>Questions</h4>
          <div className="questions-grid">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                className={`question-box ${idx === currentQuestion ? 'active' : ''} ${answers[idx] !== undefined ? 'answered' : ''}`}
                onClick={() => setCurrentQuestion(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="question-area">
          <div className="question-card">
            <h3>{question.question}</h3>

            {question.type === 'multiple-choice' && (
              <div className="options">
                {question.options.map((option, idx) => (
                  <label key={idx} className="option">
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      value={idx}
                      checked={answers[currentQuestion] === idx}
                      onChange={(e) => handleAnswerChange(parseInt(e.target.value))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'true-false' && (
              <div className="options">
                {['True', 'False'].map((option, idx) => (
                  <label key={idx} className="option">
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      value={idx}
                      checked={answers[currentQuestion] === idx}
                      onChange={(e) => handleAnswerChange(parseInt(e.target.value))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'short-answer' && (
              <textarea
                className="short-answer"
                rows="6"
                placeholder="Type your answer here..."
                value={answers[currentQuestion] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            )}
          </div>

          <div className="navigation-buttons">
            <button 
              onClick={handlePrev}
              disabled={currentQuestion === 0}
              className="btn btn-outline"
            >
              ← Previous
            </button>

            {currentQuestion === questions.length - 1 ? (
              <button 
                onClick={handleSubmitTest}
                className="btn btn-primary"
              >
                Submit Test
              </button>
            ) : (
              <button 
                onClick={handleNext}
                className="btn btn-primary"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
