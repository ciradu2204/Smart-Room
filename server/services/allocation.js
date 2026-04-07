import { supabase } from './supabaseAdmin.js'

/**
 * Auto-allocation engine.
 * Finds the best available room matching the requested criteria.
 *
 * @param {Object} criteria
 * @param {number} criteria.capacity - Minimum required capacity
 * @param {string} criteria.building - Preferred building (optional)
 * @param {string[]} criteria.amenities - Required amenities (optional)
 * @param {string} criteria.startTime - ISO timestamp for booking start
 * @param {string} criteria.endTime - ISO timestamp for booking end
 * @returns {Object|null} Best matching room or null
 */
export async function findBestRoom(criteria) {
  const { capacity = 1, building, amenities = [], startTime, endTime } = criteria

  // Query available rooms with sufficient capacity
  let query = supabase
    .from('rooms')
    .select('*')
    .eq('is_occupied', false)
    .gte('capacity', capacity)
    .order('capacity', { ascending: true }) // Prefer smallest room that fits

  if (building) {
    query = query.eq('building', building)
  }

  const { data: rooms, error } = await query

  if (error) {
    console.error('[Allocation] Query error:', error.message)
    return null
  }

  if (!rooms || rooms.length === 0) {
    return null
  }

  // Filter by amenities if specified
  let candidates = rooms
  if (amenities.length > 0) {
    candidates = rooms.filter((room) =>
      amenities.every((a) => room.amenities?.includes(a))
    )
  }

  // TODO: Check booking conflicts for the requested time slot
  // TODO: Score rooms by proximity, energy efficiency, etc.

  return candidates[0] || null
}

/**
 * Check for ghost bookings — rooms booked but unoccupied past the threshold.
 * Called periodically or on sensor update.
 */
export async function checkGhostReleases() {
  const GHOST_THRESHOLD_MINUTES = 15

  const threshold = new Date(
    Date.now() - GHOST_THRESHOLD_MINUTES * 60 * 1000
  ).toISOString()

  const { data: ghostRooms, error } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('is_occupied', false)
    .lt('last_sensor_ping', threshold)
    // TODO: Join with active bookings to find rooms that should be released

  if (error) {
    console.error('[Ghost] Query error:', error.message)
    return []
  }

  // TODO: Cancel bookings for ghost rooms and notify users
  return ghostRooms || []
}
