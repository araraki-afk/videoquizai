import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../styles/auth.css'

export default function Register() {
  const [step, setStep] = useState(1) // 1: role selection, 2: form
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole)
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!name || !surname || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      // Simulate API call
      setTimeout(() => {
        const userData = {
          name,
          surname,
          email,
          password,
          role
        }
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('currentUser', JSON.stringify({
          email,
          name,
          surname,
          role
        }))
        // Redirect to appropriate dashboard based on role
        window.location.href = role === 'teacher' ? '/teacher' : '/'
        setIsLoading(false)
      }, 500)
    } catch (err) {
      setError('Registration failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {step === 1 ? (
        <div className="auth-card register-card">
          <div className="auth-header">
            <h1>VQ</h1>
            <p>Choose Your Role</p>
          </div>

          <div className="role-selector">
            <div 
              className={`role-option ${role === 'student' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('student')}
            >
              <div className="role-icon">👨‍🎓</div>
              <h3>Student</h3>
              <p>Take tests and track your progress</p>
            </div>

            <div 
              className={`role-option ${role === 'teacher' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('teacher')}
            >
              <div className="role-icon">👨‍🏫</div>
              <h3>Teacher</h3>
              <p>Create tests and manage classes</p>
            </div>
          </div>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
          </div>
        </div>
      ) : (
        <div className="auth-card register-card">
          <div className="auth-header">
            <button 
              type="button" 
              className="back-button"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <h1>VQ</h1>
            <p>Create {role === 'teacher' ? 'Teacher' : 'Student'} Account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">First Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="surname">Last Name</label>
                <input
                  type="text"
                  id="surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Doe"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-auth" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
          </div>
        </div>
      )}
    </div>
  )
}
