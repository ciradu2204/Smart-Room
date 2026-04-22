import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Button, Input } from '../ui'
import { formatTime } from '../../lib/utils'

function computeDuration(startTime, endTime) {
  if (!startTime || !endTime) return null
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm)
  if (totalMinutes <= 0) return null
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const parts = []
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
  if (mins > 0) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`)
  return parts.join(' ')
}

export default function EditBookingModal({ isOpen, onClose, booking, onSave }) {
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Pre-fill from existing booking
  useEffect(() => {
    if (isOpen && booking) {
      const s = new Date(booking.start_time)
      const e = new Date(booking.end_time)
      setStartTime(
        `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`
      )
      setEndTime(
        `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`
      )
      setTitle(booking.title || '')
      setError('')
    }
  }, [isOpen, booking])

  const duration = useMemo(() => computeDuration(startTime, endTime), [startTime, endTime])

  const bookingDate = booking ? new Date(booking.start_time) : null
  const dateStr = bookingDate ? format(bookingDate, 'EEEE, MMM d, yyyy') : ''
  const roomName = booking?.rooms?.name || 'Room'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!startTime || !endTime) {
      setError('Please select start and end times.')
      return
    }

    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }

    setSubmitting(true)

    const newStart = new Date(bookingDate)
    const [sh, sm] = startTime.split(':').map(Number)
    newStart.setHours(sh, sm, 0, 0)

    const newEnd = new Date(bookingDate)
    const [eh, em] = endTime.split(':').map(Number)
    newEnd.setHours(eh, em, 0, 0)

    try {
      await onSave({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        title: title || null,
      })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
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
      <div
        className="bg-white rounded-lg w-full max-w-[480px] mx-4 p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit booking for ${roomName}`}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Edit booking — {roomName}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <p className="text-sm text-gray-900 py-2">{dateStr}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                className="input text-sm"
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); setError('') }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                className="input text-sm"
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); setError('') }}
              />
            </div>
          </div>

          {duration && (
            <p className="text-sm text-gray-500 -mt-2">{duration}</p>
          )}

          <Input
            label="Meeting title (optional)"
            placeholder="e.g., Study session"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
