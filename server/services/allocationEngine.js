import { supabase } from './supabaseAdmin.js'

// Map day names to offsets from Monday (the week start).
const DAY_OFFSETS = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
}

// Kigali is UTC+2 year-round (no DST). Interpreting slot times in Kigali
// local time is what users expect — if we let the server's OS zone decide
// (Railway containers default to UTC), a client-sent Monday becomes the
// previous Monday and bookings land a week in the past.
const KIGALI_OFFSET = '+02:00'

/**
 * Convert a schedule slot + week start date (YYYY-MM-DD) into ISO timestamps.
 * All times are interpreted as Kigali-local; the returned ISO strings carry
 * an explicit +02:00 offset so Postgres stores them unambiguously.
 */
function slotToTimestamps(slot, weekStartDate) {
  const [y, m, d] = weekStartDate.slice(0, 10).split('-').map(Number)
  const dayOffset = DAY_OFFSETS[slot.dayOfWeek] ?? 0
  // Compute the target day as a UTC date (no timezone math), then format.
  const target = new Date(Date.UTC(y, m - 1, d + dayOffset))
  const yyyy = target.getUTCFullYear()
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(target.getUTCDate()).padStart(2, '0')
  const dayStr = `${yyyy}-${mm}-${dd}`

  const pad = (s) => s.padStart(5, '0') // HH:MM → zero-padded
  const startIso = `${dayStr}T${pad(slot.startTime)}:00${KIGALI_OFFSET}`
  const endIso   = `${dayStr}T${pad(slot.endTime)}:00${KIGALI_OFFSET}`

  return {
    start: new Date(startIso).toISOString(),
    end:   new Date(endIso).toISOString(),
  }
}

/**
 * Check if a room has any conflicting bookings in the given time range.
 * Returns the conflicting booking if found (for override detection), null otherwise.
 */
async function findConflict(roomId, startISO, endISO) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles(display_name, role)')
    .eq('room_id', roomId)
    .not('status', 'in', '("cancelled","ghost_released")')
    .lt('start_time', endISO)
    .gt('end_time', startISO)
    .limit(1)

  if (error) {
    console.error('[AllocationEngine] Conflict check error:', error.message)
    return null
  }

  return data?.[0] || null
}

/**
 * Auto-allocate rooms for a set of schedule slots.
 *
 * @param {string} userId - The requesting user's ID
 * @param {Array} slots - Array of { dayOfWeek, startTime, endTime, preferredCapacity, requiredFeatures }
 * @param {string} weekStartDate - ISO date string for the Monday of the target week
 * @returns {{ allocations: Array, overrides: Array }}
 */
export async function allocateRooms(userId, slots, weekStartDate) {
  // 1. Get user role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error('Could not fetch user profile')
  }

  const userRole = profile?.role || 'student'
  const isFacultyOrAdmin = userRole === 'faculty' || userRole === 'admin'

  const allocations = []
  const overrides = []

  // Track rooms already allocated in this batch to avoid double-booking
  const batchAllocated = new Map() // roomId -> [{ start, end }]

  const nowIso = new Date().toISOString()

  for (const slot of slots) {
    const { start, end } = slotToTimestamps(slot, weekStartDate)

    // Refuse to allocate into the past — on Wednesday, Monday/Tuesday of the
    // current week are already gone, and booking backwards would clutter the
    // room with sessions that can never be honoured.
    if (end <= nowIso) {
      allocations.push({
        slot,
        room: null,
        allocated: false,
        reason: 'This time slot has already passed',
      })
      continue
    }

    // 2. Query candidate rooms: capacity >= preferred, ordered smallest first
    let query = supabase
      .from('rooms')
      .select('*')
      .gte('capacity', slot.preferredCapacity || 1)
      .order('capacity', { ascending: true })

    const { data: rooms, error: roomError } = await query

    if (roomError || !rooms || rooms.length === 0) {
      allocations.push({
        slot,
        room: null,
        allocated: false,
        reason: 'No rooms with sufficient capacity',
      })
      continue
    }

    // 3. Filter by required features
    let candidates = rooms
    const features = slot.requiredFeatures || []
    if (features.length > 0) {
      candidates = rooms.filter((room) =>
        features.every((f) => room.amenities?.includes(f))
      )
    }

    if (candidates.length === 0) {
      allocations.push({
        slot,
        room: null,
        allocated: false,
        reason: 'No rooms with required features',
      })
      continue
    }

    // 4. Try each candidate
    let allocated = false

    for (const room of candidates) {
      // Check batch conflicts (rooms allocated earlier in this same request)
      const batchSlots = batchAllocated.get(room.id) || []
      const batchConflict = batchSlots.some(
        (b) => new Date(start) < new Date(b.end) && new Date(end) > new Date(b.start)
      )
      if (batchConflict) continue

      // Check database conflicts
      const conflict = await findConflict(room.id, start, end)

      if (!conflict) {
        // No conflict — allocate
        allocations.push({
          slot,
          room: {
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            amenities: room.amenities,
          },
          allocated: true,
          startTime: start,
          endTime: end,
        })

        // Track in batch
        const existing = batchAllocated.get(room.id) || []
        existing.push({ start, end })
        batchAllocated.set(room.id, existing)

        allocated = true
        break
      }

      // Conflict exists — can we override?
      if (isFacultyOrAdmin) {
        const conflictRole = conflict.profiles?.role || 'student'
        if (conflictRole === 'student') {
          // Faculty/admin can displace a student
          allocations.push({
            slot,
            room: {
              id: room.id,
              name: room.name,
              capacity: room.capacity,
              amenities: room.amenities,
            },
            allocated: true,
            startTime: start,
            endTime: end,
            overrideBookingId: conflict.id,
          })

          overrides.push({
            displacedBookingId: conflict.id,
            displacedUserName: conflict.profiles?.display_name || 'Unknown student',
            displacedUserId: conflict.user_id,
            roomName: room.name,
            slot,
          })

          const existing = batchAllocated.get(room.id) || []
          existing.push({ start, end })
          batchAllocated.set(room.id, existing)

          allocated = true
          break
        }
      }

      // Can't override faculty/admin — try next room
    }

    if (!allocated) {
      allocations.push({
        slot,
        room: null,
        allocated: false,
        reason: 'All matching rooms are booked for this time',
      })
    }
  }

  return { allocations, overrides }
}
