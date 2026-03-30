import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/pages.css'

export default function StudentDashboard({ user }) {
  const [tests, setTests] = useState([
    { id: 1, title: 'Math Basics', status: 'pending', subject: 'Mathematics', questions: 20 },
    { id: 2, title: 'English Grammar', status: 'completed', subject: 'English', questions: 15, score: 85 },
    { id: 3, title: 'History', status: 'pending', subject: 'History', questions: 25 },
    { id: 4, title: 'Science Quiz', status: 'completed', subject: 'Science', questions: 18, score: 92 }
  ])

  const recentActivity = [
    { id: 1, action: 'Completed test', title: 'English Grammar', date: '2 hours ago' },
    { id: 2, action: 'Started test', title: 'Math Basics', date: 'Yesterday' },
    { id: 3, action: 'Viewed results', title: 'Science Quiz', date: '3 days ago' }
  ]

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome Back, {user?.name}! 👋</h1>
          <p>Here's your learning progress for this week</p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">4</span>
            <span className="stat-label">Tests Available</span>
          </div>
          <div className="stat">
            <span className="stat-value">2</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat">
            <span className="stat-value">88.5%</span>
            <span className="stat-label">Avg Score</span>
          </div>
        </div>
      </header>

      <section className="pending-tests">
        <div className="section-header">
          <h2>📋 Your Tests</h2>
          <Link to="#" className="view-all-link">View All</Link>
        </div>
        
        <div className="tests-grid">
          {tests.map(test => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      </section>

      <section className="recent-activity">
        <div className="section-header">
          <h2>📊 Recent Activity</h2>
        </div>
        
        <div className="activity-list">
          {recentActivity.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">
                {activity.action.includes('Completed') && '✅'}
                {activity.action.includes('Started') && '▶️'}
                {activity.action.includes('Viewed') && '👁️'}
              </div>
              <div className="activity-content">
                <p className="activity-action">{activity.action}</p>
                <p className="activity-title">{activity.title}</p>
              </div>
              <span className="activity-date">{activity.date}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function TestCard({ test }) {
  const statusColor = test.status === 'completed' ? '#22c55e' : '#f59e0b'
  
  return (
    <div className="test-card">
      <div className="test-header">
        <h3>{test.title}</h3>
        <span className={`status status-${test.status}`}>
          {test.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
        </span>
      </div>
      
      <div className="test-meta">
        <span className="subject">{test.subject}</span>
        <span className="questions">{test.questions} Questions</span>
      </div>

      {test.status === 'completed' && (
        <div className="test-score">
          <div className="score-bar">
            <div className="score-fill" style={{ width: `${test.score}%` }}></div>
          </div>
          <p className="score-text">Score: {test.score}%</p>
        </div>
      )}

      <div className="test-actions">
        {test.status === 'pending' && (
          <Link to={`/test/${test.id}`} className="btn btn-primary">
            Start Test
          </Link>
        )}
        {test.status === 'completed' && (
          <>
            <Link to={`/results/${test.id}`} className="btn btn-secondary">
              View Results
            </Link>
            <Link to={`/test/${test.id}`} className="btn btn-outline">
              Retake
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
