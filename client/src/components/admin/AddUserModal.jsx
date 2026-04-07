import { useState } from 'react'
import { Button, Input } from '../ui'

export default function AddUserModal({ isOpen, onClose, onSave }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setDisplayName('')
    setEmail('')
    setPassword('')
    setRole('student')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) {
      setError('Name is required.')
      return
    }
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      await onSave({
        display_name: displayName.trim(),
        email: email.trim(),
        password,
        role,
      })
      reset()
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6" role="dialog" aria-modal="true">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add User</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            placeholder="e.g., Jane Doe"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setError('') }}
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="andrewid@andrew.cmu.edu"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <div className="flex gap-2">
              {['student', 'faculty'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`text-sm px-4 py-2 rounded-full font-medium transition-colors duration-150 ${
                    role === r
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { reset(); onClose() }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create user'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
