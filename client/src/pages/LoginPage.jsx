import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'
import Skeleton from '../components/ui/Skeleton'

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname || '/rooms'

  // Full-page skeleton while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton width="160px" height="20px" />
      </div>
    )
  }

  // Already logged in — redirect
  if (user) {
    return <Navigate to={from} replace />
  }

  function clearError() {
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-[400px]">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">SmartRoom</h1>
          <p className="text-sm text-gray-500 mt-1">Room booking for CMU Africa</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="flex items-start justify-between gap-2 rounded-md bg-rose-50 border border-rose-200 p-3">
              <p className="text-sm text-rose-700">{error}</p>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-rose-400 hover:text-rose-600 transition-colors duration-150 shrink-0"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.47 4.47a.75.75 0 011.06 0L8 6.94l2.47-2.47a.75.75 0 111.06 1.06L9.06 8l2.47 2.47a.75.75 0 11-1.06 1.06L8 9.06l-2.47 2.47a.75.75 0 01-1.06-1.06L6.94 8 4.47 5.53a.75.75 0 010-1.06z" />
                </svg>
              </button>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="andrewid@andrew.cmu.edu"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError() }}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError() }}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-sm text-center mt-4">
          <span className="text-gray-500">Don't have an account? </span>
          <Link to="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-150">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
