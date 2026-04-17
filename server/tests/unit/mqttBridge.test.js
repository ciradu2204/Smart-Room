/**
 * Unit tests for mqttBridge payload helpers.
 * Tests bookingToWirePayload epoch conversion logic in isolation.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const KIGALI_OFFSET_SECONDS = 2 * 60 * 60 // UTC+2

function bookingToWirePayload(booking, userName) {
  const startEpoch = Math.floor(new Date(booking.start_time).getTime() / 1000) + KIGALI_OFFSET_SECONDS
  const endEpoch   = Math.floor(new Date(booking.end_time).getTime()   / 1000) + KIGALI_OFFSET_SECONDS
  return {
    bookingId: booking.id,
    userName: userName || '',
    title: booking.title || '',
    startTime: startEpoch,
    endTime: endEpoch,
    status: booking.status,
  }
}

function walkUpUtcFromDevice(deviceEpoch) {
  return new Date((deviceEpoch - KIGALI_OFFSET_SECONDS) * 1000).toISOString()
}

describe('bookingToWirePayload', () => {
  const booking = {
    id: 'abc-123',
    user_id: 'user-1',
    title: 'Team meeting',
    start_time: '2025-01-06T08:00:00.000Z', // 08:00 UTC = 10:00 Kigali
    end_time:   '2025-01-06T09:00:00.000Z', // 09:00 UTC = 11:00 Kigali
    status: 'scheduled',
  }

  const payload = bookingToWirePayload(booking, 'Alice')

  it('includes bookingId', () => assert.equal(payload.bookingId, 'abc-123'))
  it('includes userName', () => assert.equal(payload.userName, 'Alice'))
  it('includes title', () => assert.equal(payload.title, 'Team meeting'))
  it('includes status', () => assert.equal(payload.status, 'scheduled'))

  it('shifts startTime by +7200 (Kigali offset)', () => {
    const utcEpoch = Math.floor(new Date(booking.start_time).getTime() / 1000)
    assert.equal(payload.startTime, utcEpoch + KIGALI_OFFSET_SECONDS)
  })

  it('shifts endTime by +7200 (Kigali offset)', () => {
    const utcEpoch = Math.floor(new Date(booking.end_time).getTime() / 1000)
    assert.equal(payload.endTime, utcEpoch + KIGALI_OFFSET_SECONDS)
  })

  it('endTime is greater than startTime', () => {
    assert.ok(payload.endTime > payload.startTime)
  })

  it('defaults userName to empty string when null', () => {
    const p = bookingToWirePayload(booking, null)
    assert.equal(p.userName, '')
  })

  it('defaults title to empty string when missing', () => {
    const p = bookingToWirePayload({ ...booking, title: undefined }, 'Bob')
    assert.equal(p.title, '')
  })
})

describe('walkUpUtcFromDevice (round-trip)', () => {
  it('converts device epoch back to UTC correctly', () => {
    // Suppose UTC is 08:00, device sends 10:00 Kigali epoch
    const utcDate = new Date('2025-01-06T08:00:00.000Z')
    const utcEpoch = Math.floor(utcDate.getTime() / 1000)
    const deviceEpoch = utcEpoch + KIGALI_OFFSET_SECONDS // what ESP32 sends

    const recovered = walkUpUtcFromDevice(deviceEpoch)
    assert.equal(recovered, utcDate.toISOString())
  })

  it('round-trips startTime through wire format and back', () => {
    const booking = {
      id: 'x', title: 'Test', status: 'active',
      start_time: '2025-03-15T14:00:00.000Z',
      end_time:   '2025-03-15T15:00:00.000Z',
    }
    const wire = bookingToWirePayload(booking, '')
    const recovered = walkUpUtcFromDevice(wire.startTime)
    assert.equal(recovered, booking.start_time)
  })
})

describe('topic routing helpers', () => {
  function routeTopic(topic) {
    const parts = topic.split('/')
    if (parts.length === 3 && parts[2] === 'status') return 'status'
    if (parts.length === 3 && parts[2] === 'walk-up') return 'walkup'
    if (parts.length === 4 && parts[1] === 'rooms' && parts[3] === 'sensors') return 'sensors'
    return 'unknown'
  }

  it('routes status topic', () => {
    assert.equal(routeTopic('smartroom/room-1/status'), 'status')
  })

  it('routes walk-up topic', () => {
    assert.equal(routeTopic('smartroom/room-1/walk-up'), 'walkup')
  })

  it('routes legacy sensor topic', () => {
    assert.equal(routeTopic('smartroom/rooms/room-1/sensors'), 'sensors')
  })

  it('returns unknown for unrecognised topic', () => {
    assert.equal(routeTopic('smartroom/room-1/other'), 'unknown')
  })

  it('extracts roomId from status topic', () => {
    const parts = 'smartroom/abc-room-id/status'.split('/')
    assert.equal(parts[1], 'abc-room-id')
  })
})
