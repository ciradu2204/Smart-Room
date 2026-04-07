import { Router } from 'express'
import { allocateRooms } from '../services/allocationEngine.js'
import { supabase } from '../services/supabaseAdmin.js'

const router = Router()

/**
 * POST /api/allocate
 * Body: { userId, slots: [...], weekStartDate }
 * Returns allocation results with room assignments and any overrides.
 */
router.post('/', async (req, res) => {
  try {
    const { userId, slots, weekStartDate } = req.body

    if (!userId || !slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: userId, slots (non-empty array)',
      })
    }

    if (!weekStartDate) {
      return res.status(400).json({
        error: 'Missing required field: weekStartDate',
      })
    }

    // Validate each slot
    for (const slot of slots) {
      if (!slot.dayOfWeek || !slot.startTime || !slot.endTime) {
        return res.status(400).json({
          error: 'Each slot must have dayOfWeek, startTime, and endTime',
        })
      }
      if (slot.endTime <= slot.startTime) {
        return res.status(400).json({
          error: `Invalid time range for ${slot.dayOfWeek}: end must be after start`,
        })
      }
    }

    const result = await allocateRooms(userId, slots, weekStartDate)
    res.json(result)
  } catch (err) {
    console.error('[Allocate] Error:', err.message)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

/**
 * POST /api/allocate/confirm
 * Body: { userId, allocations: [...] }
 * Cancels overridden bookings and inserts new ones using service role.
 */
router.post('/confirm', async (req, res) => {
  try {
    const { userId, allocations } = req.body

    if (!userId || !allocations || !Array.isArray(allocations)) {
      return res.status(400).json({ error: 'Missing userId or allocations.' })
    }

    const successful = allocations.filter((a) => a.allocated)
    if (successful.length === 0) {
      return res.status(400).json({ error: 'No successful allocations to confirm.' })
    }

    // Get requester name for notifications
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
    const requesterName = requesterProfile?.display_name || 'A faculty member'

    // Cancel overridden bookings and notify displaced users
    for (const a of successful) {
      if (a.overrideBookingId) {
        // Get the booking details before cancelling
        const { data: overriddenBooking } = await supabase
          .from('bookings')
          .select('user_id, title, start_time, end_time')
          .eq('id', a.overrideBookingId)
          .single()

        const { error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', a.overrideBookingId)

        if (error) {
          console.error(`[Allocate:Confirm] Failed to cancel booking ${a.overrideBookingId}:`, error.message)
        }

        // Send notification to the displaced user
        if (overriddenBooking) {
          await supabase.from('notifications').insert({
            user_id: overriddenBooking.user_id,
            type: 'booking_overridden',
            title: 'Booking overridden',
            message: `Your booking "${overriddenBooking.title || 'Untitled'}" in ${a.room.name} has been overridden by ${requesterName}. Please book another room.`,
            metadata: {
              booking_id: a.overrideBookingId,
              room_name: a.room.name,
              overridden_by: requesterName,
              original_start: overriddenBooking.start_time,
              original_end: overriddenBooking.end_time,
            },
          }).then(({ error: notifError }) => {
            if (notifError) {
              console.error('[Allocate:Confirm] Failed to send notification:', notifError.message)
            }
          })
        }
      }
    }

    // Insert new bookings
    const bookings = successful.map((a) => ({
      room_id: a.room.id,
      user_id: userId,
      start_time: a.startTime,
      end_time: a.endTime,
      title: a.slot.title || `Auto-allocated: ${a.slot.dayOfWeek}`,
      status: 'scheduled',
    }))

    const { error: insertError } = await supabase.from('bookings').insert(bookings)

    if (insertError) {
      return res.status(500).json({ error: insertError.message })
    }

    res.json({ booked: successful.length })
  } catch (err) {
    console.error('[Allocate:Confirm] Error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
