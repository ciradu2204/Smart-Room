/**
 * Unit tests for BookingModal validation logic.
 * Tests overlap detection, time validation, and advance-booking limits.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ── Mirrors BookingModal.checkOverlap ──
function checkOverlap(bookingStart, bookingEnd, existingBookings) {
  return existingBookings.find((b) => {
    const bStart = new Date(b.start_time)
    const bEnd   = new Date(b.end_time)
    return bookingStart < bEnd && bookingEnd > bStart
  }) || null
}

// ── Mirrors BookingModal time validation ──
function validateBookingTimes(startTime, endTime, title) {
  const errors = []
  if (!title || !title.trim()) errors.push('Please add a title or reason for your booking.')
  if (!startTime || !endTime)   errors.push('Please select start and end times.')
  if (startTime && endTime && endTime <= startTime) errors.push('End time must be after start time.')
  return errors
}

// ── Mirrors BookingModal advance booking limit ──
function isWithinAdvanceLimit(selectedDay, role) {
  const maxWeeks = role === 'faculty' ? 2 : 1
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + maxWeeks * 7)
  return new Date(selectedDay) <= maxDate
}

// ── Mirrors time label generation ──
function formatTimeLabel(h, m) {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

describe('checkOverlap', () => {
  const existing = [
    {
      start_time: '2025-01-06T09:00:00.000Z',
      end_time:   '2025-01-06T10:00:00.000Z',
    },
  ]

  it('detects direct overlap', () => {
    const start = new Date('2025-01-06T09:30:00.000Z')
    const end   = new Date('2025-01-06T10:30:00.000Z')
    assert.ok(checkOverlap(start, end, existing) !== null)
  })

  it('detects overlap when new booking contains existing', () => {
    const start = new Date('2025-01-06T08:00:00.000Z')
    const end   = new Date('2025-01-06T11:00:00.000Z')
    assert.ok(checkOverlap(start, end, existing) !== null)
  })

  it('no overlap for back-to-back booking (new starts exactly when old ends)', () => {
    const start = new Date('2025-01-06T10:00:00.000Z')
    const end   = new Date('2025-01-06T11:00:00.000Z')
    assert.equal(checkOverlap(start, end, existing), null)
  })

  it('no overlap for booking before existing', () => {
    const start = new Date('2025-01-06T07:00:00.000Z')
    const end   = new Date('2025-01-06T09:00:00.000Z')
    assert.equal(checkOverlap(start, end, existing), null)
  })

  it('returns null when no existing bookings', () => {
    const start = new Date('2025-01-06T09:00:00.000Z')
    const end   = new Date('2025-01-06T10:00:00.000Z')
    assert.equal(checkOverlap(start, end, []), null)
  })
})

describe('validateBookingTimes', () => {
  it('passes with valid inputs', () => {
    const errs = validateBookingTimes('09:00', '10:00', 'Team sync')
    assert.equal(errs.length, 0)
  })

  it('fails when title is empty', () => {
    const errs = validateBookingTimes('09:00', '10:00', '')
    assert.ok(errs.some((e) => e.includes('title')))
  })

  it('fails when title is whitespace only', () => {
    const errs = validateBookingTimes('09:00', '10:00', '   ')
    assert.ok(errs.some((e) => e.includes('title')))
  })

  it('fails when startTime is missing', () => {
    const errs = validateBookingTimes('', '10:00', 'Meeting')
    assert.ok(errs.some((e) => e.includes('start and end times')))
  })

  it('fails when endTime is missing', () => {
    const errs = validateBookingTimes('09:00', '', 'Meeting')
    assert.ok(errs.some((e) => e.includes('start and end times')))
  })

  it('fails when end time equals start time', () => {
    const errs = validateBookingTimes('09:00', '09:00', 'Meeting')
    assert.ok(errs.some((e) => e.includes('End time must be after')))
  })

  it('fails when end time is before start time', () => {
    const errs = validateBookingTimes('10:00', '09:00', 'Meeting')
    assert.ok(errs.some((e) => e.includes('End time must be after')))
  })

  it('can produce multiple errors at once', () => {
    const errs = validateBookingTimes('', '', '')
    assert.ok(errs.length >= 2)
  })
})

describe('isWithinAdvanceLimit', () => {
  it('allows student booking within 1 week', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 3)
    assert.ok(isWithinAdvanceLimit(tomorrow, 'student'))
  })

  it('rejects student booking more than 1 week ahead', () => {
    const tooFar = new Date()
    tooFar.setDate(tooFar.getDate() + 10)
    assert.ok(!isWithinAdvanceLimit(tooFar, 'student'))
  })

  it('allows faculty booking within 2 weeks', () => {
    const inTenDays = new Date()
    inTenDays.setDate(inTenDays.getDate() + 10)
    assert.ok(isWithinAdvanceLimit(inTenDays, 'faculty'))
  })

  it('rejects faculty booking more than 2 weeks ahead', () => {
    const tooFar = new Date()
    tooFar.setDate(tooFar.getDate() + 20)
    assert.ok(!isWithinAdvanceLimit(tooFar, 'faculty'))
  })

  it('allows booking for today', () => {
    assert.ok(isWithinAdvanceLimit(new Date(), 'student'))
  })
})

describe('formatTimeLabel', () => {
  it('formats midnight correctly', () => {
    assert.equal(formatTimeLabel(0, 0), '12:00 AM')
  })

  it('formats noon correctly', () => {
    assert.equal(formatTimeLabel(12, 0), '12:00 PM')
  })

  it('formats 1pm correctly', () => {
    assert.equal(formatTimeLabel(13, 0), '1:00 PM')
  })

  it('formats 9:30am correctly', () => {
    assert.equal(formatTimeLabel(9, 30), '9:30 AM')
  })

  it('formats 11:30pm correctly', () => {
    assert.equal(formatTimeLabel(23, 30), '11:30 PM')
  })
})
