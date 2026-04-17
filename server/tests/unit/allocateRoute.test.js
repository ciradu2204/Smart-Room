/**
 * Unit tests for /api/allocate route validation logic.
 * Tests input guards without standing up the server.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ── Mirrors the guard logic from routes/allocate.js ──

function validateAllocateBody(body) {
  const { userId, slots, weekStartDate } = body || {}

  if (!userId || !slots || !Array.isArray(slots) || slots.length === 0) {
    return { valid: false, error: 'Missing required fields: userId, slots (non-empty array)' }
  }

  if (!weekStartDate) {
    return { valid: false, error: 'Missing required field: weekStartDate' }
  }

  for (const slot of slots) {
    if (!slot.dayOfWeek || !slot.startTime || !slot.endTime) {
      return { valid: false, error: 'Each slot must have dayOfWeek, startTime, and endTime' }
    }
    if (slot.endTime <= slot.startTime) {
      return { valid: false, error: `Invalid time range for ${slot.dayOfWeek}: end must be after start` }
    }
  }

  return { valid: true }
}

function validateConfirmBody(body) {
  const { userId, allocations } = body || {}
  if (!userId || !allocations || !Array.isArray(allocations)) {
    return { valid: false, error: 'Missing userId or allocations.' }
  }
  const successful = allocations.filter((a) => a.allocated)
  if (successful.length === 0) {
    return { valid: false, error: 'No successful allocations to confirm.' }
  }
  return { valid: true, successful }
}

describe('validateAllocateBody', () => {
  const validSlot = { dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00' }

  it('passes with valid input', () => {
    const result = validateAllocateBody({
      userId: 'u1',
      slots: [validSlot],
      weekStartDate: '2025-01-06',
    })
    assert.ok(result.valid)
  })

  it('fails when userId missing', () => {
    const r = validateAllocateBody({ slots: [validSlot], weekStartDate: '2025-01-06' })
    assert.ok(!r.valid)
    assert.ok(r.error.includes('userId'))
  })

  it('fails when slots is empty array', () => {
    const r = validateAllocateBody({ userId: 'u1', slots: [], weekStartDate: '2025-01-06' })
    assert.ok(!r.valid)
  })

  it('fails when slots is not an array', () => {
    const r = validateAllocateBody({ userId: 'u1', slots: validSlot, weekStartDate: '2025-01-06' })
    assert.ok(!r.valid)
  })

  it('fails when weekStartDate missing', () => {
    const r = validateAllocateBody({ userId: 'u1', slots: [validSlot] })
    assert.ok(!r.valid)
    assert.ok(r.error.includes('weekStartDate'))
  })

  it('fails when slot missing dayOfWeek', () => {
    const r = validateAllocateBody({
      userId: 'u1',
      slots: [{ startTime: '09:00', endTime: '10:00' }],
      weekStartDate: '2025-01-06',
    })
    assert.ok(!r.valid)
    assert.ok(r.error.includes('dayOfWeek'))
  })

  it('fails when slot end time equals start time', () => {
    const r = validateAllocateBody({
      userId: 'u1',
      slots: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '09:00' }],
      weekStartDate: '2025-01-06',
    })
    assert.ok(!r.valid)
    assert.ok(r.error.includes('end must be after start'))
  })

  it('fails when slot end time is before start time', () => {
    const r = validateAllocateBody({
      userId: 'u1',
      slots: [{ dayOfWeek: 'Monday', startTime: '10:00', endTime: '09:00' }],
      weekStartDate: '2025-01-06',
    })
    assert.ok(!r.valid)
  })

  it('accepts multiple valid slots', () => {
    const r = validateAllocateBody({
      userId: 'u1',
      slots: [
        { dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 'Wednesday', startTime: '14:00', endTime: '16:00' },
      ],
      weekStartDate: '2025-01-06',
    })
    assert.ok(r.valid)
  })
})

describe('validateConfirmBody', () => {
  const allocations = [
    { allocated: true, room: { id: 'r1', name: 'Lab A' }, startTime: '...', endTime: '...' },
    { allocated: false, reason: 'No rooms available' },
  ]

  it('passes with valid input', () => {
    const r = validateConfirmBody({ userId: 'u1', allocations })
    assert.ok(r.valid)
    assert.equal(r.successful.length, 1)
  })

  it('fails when userId missing', () => {
    const r = validateConfirmBody({ allocations })
    assert.ok(!r.valid)
  })

  it('fails when allocations missing', () => {
    const r = validateConfirmBody({ userId: 'u1' })
    assert.ok(!r.valid)
  })

  it('fails when all allocations are unsuccessful', () => {
    const r = validateConfirmBody({
      userId: 'u1',
      allocations: [{ allocated: false, reason: 'No rooms' }],
    })
    assert.ok(!r.valid)
    assert.ok(r.error.includes('No successful'))
  })

  it('returns only successful allocations in result', () => {
    const r = validateConfirmBody({ userId: 'u1', allocations })
    assert.equal(r.successful.length, 1)
    assert.ok(r.successful[0].allocated)
  })
})
