import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/pages.css'

export default function TeacherDashboard({ user }) {
  const [classes, setClasses] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('')
  const [studentEmails, setStudentEmails] = useState([''])
  const [error, setError] = useState('')

  const recentTests = [
    { id: 1, name: 'Math Final Exam', class: 'Class 10A', students: 32, date: '2 hours ago' },
    { id: 2, name: 'English Quiz', class: 'Class 10B', students: 28, date: 'Yesterday' },
    { id: 3, name: 'Science Project', class: 'Class 9A', students: 30, date: '3 days ago' }
  ]

  const handleAddStudentEmail = () => {
    setStudentEmails([...studentEmails, ''])
  }

  const handleRemoveStudentEmail = (index) => {
    setStudentEmails(studentEmails.filter((_, i) => i !== index))
  }

  const handleStudentEmailChange = (index, value) => {
    const newEmails = [...studentEmails]
    newEmails[index] = value
    setStudentEmails(newEmails)
  }

  const handleCreateClass = (e) => {
    e.preventDefault()
    setError('')

    if (!className.trim()) {
      setError('Class name is required')
      return
    }

    if (!subject.trim()) {
      setError('Subject is required')
      return
    }

    const validEmails = studentEmails.filter(email => email.trim() !== '')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    for (const email of validEmails) {
      if (!emailRegex.test(email)) {
        setError(`Invalid email format: ${email}`)
        return
      }
    }

    const newClass = {
      id: classes.length + 1,
      name: className,
      subject: subject,
      students: validEmails.length,
      studentList: validEmails,
      tests: 0,
      avgScore: 0,
      createdAt: new Date().toLocaleDateString()
    }

    setClasses([...classes, newClass])
    
    // Reset form
    setClassName('')
    setSubject('')
    setStudentEmails([''])
    setShowCreateModal(false)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setClassName('')
    setSubject('')
    setStudentEmails([''])
    setError('')
  }

  const totalStudents = classes.reduce((sum, cls) => sum + cls.students, 0)

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome Back, {user?.name}! 👨‍🏫</h1>
          <p>Manage your classes and track student progress</p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{classes.length}</span>
            <span className="stat-label">Classes</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalStudents}</span>
            <span className="stat-label">Total Students</span>
          </div>
          <div className="stat">
            <span className="stat-value">{classes.reduce((sum, cls) => sum + cls.tests, 0)}</span>
            <span className="stat-label">Active Tests</span>
          </div>
        </div>
      </header>

      <section className="classes-section">
        <div className="section-header">
          <h2>📚 Your Classes</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>Create New Class</button>
        </div>

        {classes.length === 0 ? (
          <div className="empty-state">
            <p>No classes yet. Create your first class to get started!</p>
          </div>
        ) : (
          <div className="classes-grid">
            {classes.map(cls => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </section>

      {classes.length > 0 && (
        <section className="recent-tests">
          <div className="section-header">
            <h2>📝 Recent Tests</h2>
            <Link to="#" className="view-all-link">Create New Test</Link>
          </div>

          <div className="tests-list">
            {recentTests.map(test => (
              <div key={test.id} className="test-item">
                <div className="test-info">
                  <h4>{test.name}</h4>
                  <p className="test-class">{test.class} • {test.students} students</p>
                </div>
                <span className="test-date">{test.date}</span>
                <button className="btn btn-secondary btn-sm">Manage</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Class</h2>
              <button className="close-button" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleCreateClass} className="create-class-form">
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label htmlFor="className">Class Name *</label>
                <input
                  type="text"
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g., Class 10A"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>

              <div className="form-group students-section">
                <label>Add Students by Email</label>
                <div className="students-list">
                  {studentEmails.map((email, index) => (
                    <div key={index} className="student-email-input">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleStudentEmailChange(index, e.target.value)}
                        placeholder="student@example.com"
                      />
                      {studentEmails.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-remove"
                          onClick={() => handleRemoveStudentEmail(index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm add-student-btn"
                  onClick={handleAddStudentEmail}
                >
                  + Add Another Student
                </button>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Class</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ClassCard({ cls }) {
  return (
    <div className="class-card">
      <div className="class-header">
        <h3>{cls.name}</h3>
        <span className="class-badge">{cls.subject}</span>
      </div>

      <div className="class-stats">
        <div className="class-stat">
          <span className="label">Students</span>
          <span className="value">{cls.students}</span>
        </div>
        <div className="class-stat">
          <span className="label">Tests</span>
          <span className="value">{cls.tests}</span>
        </div>
      </div>

      <div className="class-actions">
        <button className="btn btn-secondary btn-sm">View Details</button>
        <button className="btn btn-outline btn-sm">Edit Class</button>
      </div>
    </div>
  )
}
