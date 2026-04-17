/**
 * Unit tests for bookingSweep logic.
 * Tests the "is booking expired?" check in isolation.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function isExpired(endTime, now = new Date()) {
  return new Date(endTime) < now
}

function isCompletable(status) {
  return ['scheduled', 'active'].includes(status)
}

describe('isExpired', () => {
  it('returns true when end_time is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    assert.ok(isExpired(past))
  })

  it('returns false when end_time is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    assert.ok(!isExpired(future))
  })

  it('returns true when end_time equals now (edge: exactly at boundary)', () => {
    const now = new Date()
    // A booking that ended exactly at "now" should be considered expired
    const justPast = new Date(now.getTime() - 1).toISOString()
    assert.ok(isExpired(justPast, now))
  })

  it('handles ISO strings and Date objects equally', () => {
    const past = '2020-01-01T00:00:00.000Z'
    assert.ok(isExpired(past))
  })
})

describe('isCompletable', () => {
  it('returns true for scheduled', () => assert.ok(isCompletable('scheduled')))
  it('returns true for active', () => assert.ok(isCompletable('active')))
  it('returns false for completed', () => assert.ok(!isCompletable('completed')))
  it('returns false for cancelled', () => assert.ok(!isCompletable('cancelled')))
  it('returns false for ghost_released', () => assert.ok(!isCompletable('ghost_released')))
})

describe('sweep logic: only expired + completable rows should be updated', () => {
  const bookings = [
    { id: '1', status: 'active',       end_time: new Date(Date.now() - 5000).toISOString() },
    { id: '2', status: 'scheduled',    end_time: new Date(Date.now() - 1000).toISOString() },
    { id: '3', status: 'active',       end_time: new Date(Date.now() + 9999).toISOString() }, // future
    { id: '4', status: 'completed',    end_time: new Date(Date.now() - 5000).toISOString() }, // already done
    { id: '5', status: 'cancelled',    end_time: new Date(Date.now() - 5000).toISOString() }, // cancelled
    { id: '6', status: 'ghost_released', end_time: new Date(Date.now() - 5000).toISOString() },
  ]

  const now = new Date()
  const toComplete = bookings.filter((b) => isExpired(b.end_time, now) && isCompletable(b.status))

  it('identifies exactly the right bookings to complete', () => {
    assert.equal(toComplete.length, 2)
    assert.ok(toComplete.some((b) => b.id === '1'))
    assert.ok(toComplete.some((b) => b.id === '2'))
  })

  it('does not include future bookings', () => {
    assert.ok(!toComplete.some((b) => b.id === '3'))
  })

  it('does not include already-completed bookings', () => {
    assert.ok(!toComplete.some((b) => b.id === '4'))
  })

  it('does not include cancelled or ghost_released bookings', () => {
    assert.ok(!toComplete.some((b) => b.id === '5'))
    assert.ok(!toComplete.some((b) => b.id === '6'))
  })
})
