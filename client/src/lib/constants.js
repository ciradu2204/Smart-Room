/**
 * Room status values — matches database enum and MQTT payloads.
 */
export const ROOM_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  PENDING: 'pending',
  RELEASED: 'released',
}

/**
 * Booking status values.
 */
export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
}

/**
 * Ghost-release timeout in minutes.
 * If a room is booked but sensors detect no presence after this duration,
 * the room is auto-released.
 */
export const GHOST_RELEASE_MINUTES = 15

/**
 * Toast auto-dismiss duration in ms.
 */
export const TOAST_DURATION_MS = 4000

/**
 * Pagination defaults.
 */
export const PAGE_SIZE = 20
