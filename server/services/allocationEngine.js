import { supabase } from './supabaseAdmin.js'
import { addDays, startOfWeek } from 'date-fns'

// Map day names to date-fns day offsets from Monday-based week start
const DAY_OFFSETS = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
}

/**
 * Convert a schedule slot + week start date into ISO timestamps.
 */
function slotToTimestamps(slot, weekStartDate) {
  const weekStart = startOfWeek(new Date(weekStartDate), { weekStartsOn: 1 })
  const dayDate = addDays(weekStart, DAY_OFFSETS[slot.dayOfWeek] ?? 0)

  const [sh, sm] = slot.startTime.split(':').map(Number)
  const [eh, em] = slot.endTime.split(':').map(Number)

  const startTimestamp = new Date(dayDate)
  startTimestamp.setHours(sh, sm, 0, 0)

  const endTimestamp = new Date(dayDate)
  endTimestamp.setHours(eh, em, 0, 0)

  return {
    start: startTimestamp.toISOString(),
    end: endTimestamp.toISOString(),
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

  for (const slot of slots) {
    const { start, end } = slotToTimestamps(slot, weekStartDate)

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
