import { Router } from 'express'
import { findBestRoom } from '../services/allocation.js'

const router = Router()

/**
 * POST /api/allocation/find
 * Body: { capacity, building?, amenities?, startTime, endTime }
 * Returns the best available room or 404.
 */
router.post('/find', async (req, res) => {
  try {
    const room = await findBestRoom(req.body)

    if (!room) {
      return res.status(404).json({
        error: 'No available room matches your criteria',
      })
    }

    res.json({ room })
  } catch (err) {
    console.error('[Allocation] Error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
