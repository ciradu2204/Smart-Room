import { useEffect, useMemo, useState } from 'react'
import { format, addWeeks, isAfter } from 'date-fns'
import { Button, Input } from '../ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import { supabase } from '../../lib/supabase'
import { formatTime } from '../../lib/utils'

// Generate 30-minute increments from startHour to endHour
function generateTimeOptions(startHour, endHour) {
  const options = []
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === endHour && m > 0) break
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      options.push({ value: `${hh}:${mm}`, label: formatTimeLabel(h, m) })
    }
  }
  return options
}

function formatTimeLabel(h, m) {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

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

const TIME_OPTIONS = generateTimeOptions(7, 21)

export default function BookingModal({
  isOpen,
  onClose,
  roomName,
  roomId,
  selectedDay,
  selectedHour,
  existingBookings,
}) {
  const { user, profile } = useAuth()
  const toast = useToast()

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Pre-fill from selected slot
  useEffect(() => {
    if (isOpen && selectedHour != null) {
      const hh = String(selectedHour).padStart(2, '0')
      setStartTime(`${hh}:00`)
      const eh = String(Math.min(selectedHour + 1, 21)).padStart(2, '0')
      setEndTime(`${eh}:00`)
      setTitle('')
      setError('')
    }
  }, [isOpen, selectedHour])

  const duration = useMemo(() => computeDuration(startTime, endTime), [startTime, endTime])

  const dateStr = selectedDay ? format(selectedDay, 'EEEE, MMM d, yyyy') : ''

  // Filter end time options to only those after start
  const endTimeOptions = useMemo(() => {
    if (!startTime) return TIME_OPTIONS
    return TIME_OPTIONS.filter((opt) => opt.value > startTime)
  }, [startTime])

  // Booking limit hint
  const maxAdvance = profile?.role === 'faculty' ? 2 : 1
  const maxDate = addWeeks(new Date(), maxAdvance)
  const isTooFarAhead = selectedDay && isAfter(selectedDay, maxDate)
  const advanceHint = profile?.role === 'faculty'
    ? 'Faculty can book up to 2 weeks ahead.'
    : 'Students can book up to 1 week ahead.'

  function checkOverlap() {
    if (!startTime || !endTime || !selectedDay) return null

    const bookingStart = new Date(selectedDay)
    const [sh, sm] = startTime.split(':').map(Number)
    bookingStart.setHours(sh, sm, 0, 0)

    const bookingEnd = new Date(selectedDay)
    const [eh, em] = endTime.split(':').map(Number)
    bookingEnd.setHours(eh, em, 0, 0)

    const conflict = existingBookings.find((b) => {
      const bStart = new Date(b.start_time)
      const bEnd = new Date(b.end_time)
      return bookingStart < bEnd && bookingEnd > bStart
    })

    return conflict
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please add a title or reason for your booking.')
      return
    }

    if (!startTime || !endTime) {
      setError('Please select start and end times.')
      return
    }

    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }

    if (isTooFarAhead) {
      setError(advanceHint)
      return
    }

    const conflict = checkOverlap()
    if (conflict) {
      setError(
        `This slot overlaps with an existing booking from ${formatTime(conflict.start_time)} to ${formatTime(conflict.end_time)}.`
      )
      return
    }

    setSubmitting(true)

    const bookingStart = new Date(selectedDay)
    const [sh, sm] = startTime.split(':').map(Number)
    bookingStart.setHours(sh, sm, 0, 0)

    const bookingEnd = new Date(selectedDay)
    const [eh, em] = endTime.split(':').map(Number)
    bookingEnd.setHours(eh, em, 0, 0)

    const { error: dbError } = await supabase.from('bookings').insert({
      room_id: roomId,
      user_id: user.id,
      start_time: bookingStart.toISOString(),
      end_time: bookingEnd.toISOString(),
      title: title || null,
      status: 'scheduled',
    })

    setSubmitting(false)

    if (dbError) {
      setError(dbError.message || 'Something went wrong. Please try again.')
      return
    }

    toast.success('Room booked successfully')
    onClose()
  }

  // Book a 2-minute slot starting now (for hardware testing)
  async function handleBookTest5Min() {
    setError('')

    if (!title.trim()) {
      setError('Please add a title or reason for your booking.')
      return
    }

    setSubmitting(true)

    const bookingStart = new Date()
    const bookingEnd = new Date(bookingStart.getTime() + 2 * 60 * 1000)

    // Check overlap against existing bookings for this room
    const conflict = existingBookings.find((b) => {
      const bStart = new Date(b.start_time)
      const bEnd = new Date(b.end_time)
      return bookingStart < bEnd && bookingEnd > bStart
    })

    if (conflict) {
      setSubmitting(false)
      setError(
        `This slot overlaps with an existing booking from ${formatTime(conflict.start_time)} to ${formatTime(conflict.end_time)}.`
      )
      return
    }

    const { error: dbError } = await supabase.from('bookings').insert({
      room_id: roomId,
      user_id: user.id,
      start_time: bookingStart.toISOString(),
      end_time: bookingEnd.toISOString(),
      title: title || 'Test booking',
      status: 'scheduled',
    })

    setSubmitting(false)

    if (dbError) {
      setError(dbError.message || 'Something went wrong. Please try again.')
      return
    }

    toast.success('2-minute test booking created')
    onClose()
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
        aria-label={`Book ${roomName}`}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Book {roomName}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Date (read-only) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <p className="text-sm text-gray-900 py-2">{dateStr}</p>
          </div>

          {/* Time selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Start Time</label>
              <select
                className="input text-sm"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setError('')
                }}
              >
                <option value="">Select...</option>
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">End Time</label>
              <select
                className="input text-sm"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setError('')
                }}
              >
                <option value="">Select...</option>
                {endTimeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration display */}
          {duration && (
            <p className="text-sm text-gray-500 -mt-2">{duration}</p>
          )}

          {/* Meeting title */}
          <Input
            label="Booking title / reason"
            placeholder="e.g., Study session, Group project"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError('') }}
            required
          />

          {/* Advance booking hint */}
          {isTooFarAhead && (
            <p className="text-xs text-amber-600">{advanceHint}</p>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Test-only: 5-min booking starting now */}
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-amber-800">Testing</p>
              <p className="text-xs text-amber-700">Book a 2-minute slot starting now</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleBookTest5Min}
              disabled={submitting}
            >
              Book 2 min
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Booking...' : 'Confirm booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
