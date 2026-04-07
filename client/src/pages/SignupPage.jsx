import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'
import Skeleton from '../components/ui/Skeleton'

export default function SignupPage() {
  const { user, loading: authLoading, signup } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Full-page skeleton while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton width="160px" height="20px" />
      </div>
    )
  }

  // Already logged in
  if (user) {
    return <Navigate to="/rooms" replace />
  }

  function clearError() {
    if (error) setError('')
  }

  function handleConfirmPasswordChange(value) {
    setConfirmPassword(value)
    setPasswordMismatch(value.length > 0 && password !== value)
    clearError()
  }

  function handlePasswordChange(value) {
    setPassword(value)
    if (confirmPassword.length > 0) {
      setPasswordMismatch(value !== confirmPassword)
    }
    clearError()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.endsWith('@andrew.cmu.edu')) {
      setError('Please use your CMU email address (@andrew.cmu.edu).')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setPasswordMismatch(true)
      return
    }

    setSubmitting(true)

    try {
      await signup(email, password, { display_name: displayName })
      navigate('/rooms', { replace: true })
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
            label="Display Name"
            type="text"
            placeholder="Your full name"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); clearError() }}
            required
            autoComplete="name"
          />

          <div className="flex flex-col gap-1">
            <Input
              label="Email"
              type="email"
              placeholder="andrewid@andrew.cmu.edu"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError() }}
              required
              autoComplete="email"
            />
            <p className="text-xs text-gray-400">Must be an @andrew.cmu.edu address.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Create a password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-400">At least 8 characters.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              className="input"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              required
              autoComplete="new-password"
            />
            {passwordMismatch && (
              <p className="text-xs text-rose-600">Passwords don't match.</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-sm text-center mt-4">
          <span className="text-gray-500">Already have an account? </span>
          <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-150">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
