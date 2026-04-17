/**
 * Unit tests for allocationEngine helper logic.
 * We test slotToTimestamps and the batch-conflict detection logic
 * in isolation, without hitting Supabase.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ── Inline the pure helpers so we don't need to import the whole engine ──

const DAY_OFFSETS = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
}

function startOfWeekMonday(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function slotToTimestamps(slot, weekStartDate) {
  const weekStart = startOfWeekMonday(new Date(weekStartDate))
  const offset = DAY_OFFSETS[slot.dayOfWeek] ?? 0
  const dayDate = new Date(weekStart)
  dayDate.setDate(dayDate.getDate() + offset)

  const [sh, sm] = slot.startTime.split(':').map(Number)
  const [eh, em] = slot.endTime.split(':').map(Number)

  const start = new Date(dayDate)
  start.setHours(sh, sm, 0, 0)

  const end = new Date(dayDate)
  end.setHours(eh, em, 0, 0)

  return { start: start.toISOString(), end: end.toISOString() }
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart)
}

// ── Tests ──

describe('slotToTimestamps', () => {
  const WEEK = '2025-01-06' // This is a Monday

  it('maps Monday slot to correct date', () => {
    const { start, end } = slotToTimestamps(
      { dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00' },
      WEEK
    )
    assert.ok(start.startsWith('2025-01-06'), `Expected 2025-01-06, got ${start}`)
    assert.ok(end.startsWith('2025-01-06'))
  })

  it('maps Friday slot to correct date', () => {
    const { start } = slotToTimestamps(
      { dayOfWeek: 'Friday', startTime: '14:00', endTime: '15:00' },
      WEEK
    )
    assert.ok(start.startsWith('2025-01-10'), `Expected 2025-01-10, got ${start}`)
  })

  it('maps Wednesday slot to correct date', () => {
    const { start } = slotToTimestamps(
      { dayOfWeek: 'Wednesday', startTime: '08:00', endTime: '09:30' },
      WEEK
    )
    assert.ok(start.startsWith('2025-01-08'), `Expected 2025-01-08, got ${start}`)
  })

  it('start time is before end time', () => {
    const { start, end } = slotToTimestamps(
      { dayOfWeek: 'Tuesday', startTime: '13:00', endTime: '14:30' },
      WEEK
    )
    assert.ok(new Date(start) < new Date(end), 'start must be before end')
  })

  it('handles 30-minute slots', () => {
    const { start, end } = slotToTimestamps(
      { dayOfWeek: 'Monday', startTime: '09:30', endTime: '10:00' },
      WEEK
    )
    const diffMs = new Date(end) - new Date(start)
    assert.equal(diffMs, 30 * 60 * 1000)
  })
})

describe('rangesOverlap', () => {
  const base = '2025-01-06T09:00:00.000Z'
  const mid  = '2025-01-06T10:00:00.000Z'
  const late = '2025-01-06T11:00:00.000Z'
  const end  = '2025-01-06T12:00:00.000Z'

  it('detects full overlap', () => {
    assert.ok(rangesOverlap(base, end, base, end))
  })

  it('detects partial overlap (A starts before B ends)', () => {
    assert.ok(rangesOverlap(base, mid, base, late))
  })

  it('detects overlap when B is contained within A', () => {
    assert.ok(rangesOverlap(base, end, mid, late))
  })

  it('returns false for back-to-back slots (A ends exactly when B starts)', () => {
    // [base, mid) followed by [mid, late) — no overlap
    assert.ok(!rangesOverlap(base, mid, mid, late), 'adjacent slots should NOT overlap')
  })

  it('returns false for completely non-overlapping slots', () => {
    assert.ok(!rangesOverlap(base, mid, late, end))
  })
})

describe('DAY_OFFSETS', () => {
  it('has all 7 days', () => {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    days.forEach((d) => assert.ok(d in DAY_OFFSETS, `Missing ${d}`))
  })

  it('Monday offset is 0 and Sunday is 6', () => {
    assert.equal(DAY_OFFSETS.Monday, 0)
    assert.equal(DAY_OFFSETS.Sunday, 6)
  })
})
