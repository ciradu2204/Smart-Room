import { supabase } from './supabaseAdmin.js'

// Booking status reconciliation loop.
//
// The ESP32 is authoritative for physical state (occupancy confirmation,
// ghost release via PIR) but it should NOT be the only way a booking
// transitions to "completed" — that's a pure time check the backend can
// do itself. This sweep runs every SWEEP_INTERVAL_MS and flips any row
// where status in ('scheduled', 'active') AND end_time < now() to
// status='completed'. That way:
//
//   - If the ESP32 is offline / rebooted / slow, sessions still finish
//     on time in the DB and the dashboard reflects reality.
//   - If the ESP32 publishes `completed` slightly after end_time, the
//     backend no longer misses the update window — the sweep catches
//     whatever slipped through handleRoomStatus.
//   - Walk-up rows created at the panel also get auto-completed without
//     depending on the ESP32's `completed` status event at all.
//
// Turn the interval down if you want faster reconciliation; turn it up
// to reduce Supabase query traffic. 30s is a good default.

const SWEEP_INTERVAL_MS = 30 * 1000

let timer = null

async function sweepOnce() {
  const nowIso = new Date().toISOString()

  const { data: expired, error } = await supabase
    .from('bookings')
    .update({ status: 'completed', updated_at: nowIso })
    .in('status', ['scheduled', 'active'])
    .lt('end_time', nowIso)
    .select('id, room_id')

  if (error) {
    console.error('[Sweep] Update failed:', error.message)
    return
  }

  if (expired && expired.length > 0) {
    const ids = expired.map((b) => b.id).join(', ')
    console.log(`[Sweep] Marked ${expired.length} booking(s) completed: ${ids}`)

    // Also clear the is_occupied flag on any affected room that has no
    // other currently-active booking.
    const roomIds = [...new Set(expired.map((b) => b.room_id).filter(Boolean))]
    for (const roomId of roomIds) {
      const { data: stillActive } = await supabase
        .from('bookings')
        .select('id')
        .eq('room_id', roomId)
        .in('status', ['scheduled', 'active'])
        .lte('start_time', nowIso)
        .gte('end_time', nowIso)
        .limit(1)

      if (!stillActive || stillActive.length === 0) {
        await supabase
          .from('rooms')
          .update({ is_occupied: false, last_sensor_ping: nowIso })
          .eq('id', roomId)
      }
    }
  }
}

export function start() {
  if (timer) return
  console.log(`[Sweep] Starting booking reconciliation every ${SWEEP_INTERVAL_MS / 1000}s`)
  // Run once immediately on startup so stale rows don't wait 30s.
  sweepOnce().catch((err) => console.error('[Sweep] Initial sweep failed:', err.message))
  timer = setInterval(() => {
    sweepOnce().catch((err) => console.error('[Sweep] Sweep failed:', err.message))
  }, SWEEP_INTERVAL_MS)
}

export function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[Sweep] Stopped')
  }
}
