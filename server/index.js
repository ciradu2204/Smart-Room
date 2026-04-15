import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import * as mqttBridge from './services/mqttBridge.js'
import * as bookingSweep from './services/bookingSweep.js'
import allocationRoutes from './routes/allocation.js'
import allocateRoutes from './routes/allocate.js'
import healthRoutes from './routes/health.js'
import usersRoutes from './routes/users.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/health', healthRoutes)
app.use('/api/allocation', allocationRoutes)
app.use('/api/allocate', allocateRoutes)
app.use('/api/users', usersRoutes)

// Start MQTT bridge (ESP32 connection + Supabase realtime)
mqttBridge.init()

// Start booking reconciliation sweep — marks bookings whose end_time has
// passed as 'completed' independently of the ESP32 status events.
bookingSweep.start()

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...')
  bookingSweep.stop()
  mqttBridge.shutdown()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...')
  bookingSweep.stop()
  mqttBridge.shutdown()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`[SmartRoom Server] Running on port ${PORT}`)
})
