import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../styles/auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    try {
      // Simulate API call
      setTimeout(() => {
        const user = JSON.parse(localStorage.getItem('user'))
        if (user && user.email === email && user.password === password) {
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('currentUser', JSON.stringify({
            email: user.email,
            name: user.name,
            surname: user.surname,
            role: user.role
          }))
          // Redirect to appropriate dashboard based on role
          window.location.href = user.role === 'teacher' ? '/teacher' : '/'
        } else {
          setError('Invalid email or password')
        }
        setIsLoading(false)
      }, 500)
    } catch (err) {
      setError('Login failed. Please try again.')
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

      <div className="auth-card login-card">
        <div className="auth-header">
          <h1>VQ</h1>
          <p>Welcome Back!</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

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

          <button type="submit" className="btn btn-primary btn-auth" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register" className="auth-link">Sign up</Link></p>
        </div>
      </div>
    </div>
  )
}
