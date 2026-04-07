import { Router } from 'express'
import { getClient } from '../services/mqttBridge.js'

const router = Router()

router.get('/', (req, res) => {
  const mqtt = getClient()

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mqtt: mqtt?.connected ? 'connected' : 'disconnected',
  })
})

export default router
