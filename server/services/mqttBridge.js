import mqtt from 'mqtt'
import { supabase } from './supabaseAdmin.js'
import { handleSensorMessage } from './sensorHandler.js'

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'smartroom'

// Reconnection config
const INITIAL_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 30000
const RECONNECT_MULTIPLIER = 2

let client = null
let reconnectDelay = INITIAL_RECONNECT_MS
let reconnectTimer = null
let supabaseChannel = null

// ───────────────────────────────────────────────
// Connection management
// ───────────────────────────────────────────────

function createConnectionOptions() {
  const opts = {
    // Disable mqtt.js built-in reconnect — we handle it ourselves
    reconnectPeriod: 0,
    connectTimeout: 10000,
    keepalive: 60,
    clean: true,
  }
  if (process.env.MQTT_USERNAME) {
    opts.username = process.env.MQTT_USERNAME
    opts.password = process.env.MQTT_PASSWORD
  }
  return opts
}

function scheduleReconnect() {
  if (reconnectTimer) return

  console.log(`[MQTT] Reconnecting in ${reconnectDelay}ms...`)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, reconnectDelay)

  // Exponential backoff with cap
  reconnectDelay = Math.min(reconnectDelay * RECONNECT_MULTIPLIER, MAX_RECONNECT_MS)
}

function resetReconnectDelay() {
  reconnectDelay = INITIAL_RECONNECT_MS
}

function connect() {
  if (client) {
    client.removeAllListeners()
    client.end(true)
  }

  console.log(`[MQTT] Connecting to ${BROKER_URL}...`)
  client = mqtt.connect(BROKER_URL, createConnectionOptions())

  client.on('connect', () => {
    console.log(`[MQTT] Connected to ${BROKER_URL}`)
    resetReconnectDelay()
    subscribeToTopics()
  })

  client.on('message', handleMessage)

  client.on('error', (err) => {
    console.error(`[MQTT] Error: ${err.message}`)
  })

  client.on('close', () => {
    console.warn('[MQTT] Connection closed')
    scheduleReconnect()
  })

  client.on('offline', () => {
    console.warn('[MQTT] Client offline')
  })

  client.on('reconnect', () => {
    console.log('[MQTT] Attempting reconnect...')
  })
}

function subscribeToTopics() {
  // 1. ESP32 room status updates: smartroom/+/status
  client.subscribe(`${TOPIC_PREFIX}/+/status`, (err) => {
    if (err) console.error('[MQTT] Subscribe error (status):', err.message)
    else console.log(`[MQTT] Subscribed to ${TOPIC_PREFIX}/+/status`)
  })

  // 2. Legacy sensor topic (kept for backwards compat)
  client.subscribe(`${TOPIC_PREFIX}/rooms/+/sensors`, (err) => {
    if (err) console.error('[MQTT] Subscribe error (sensors):', err.message)
    else console.log(`[MQTT] Subscribed to ${TOPIC_PREFIX}/rooms/+/sensors`)
  })
}

// ───────────────────────────────────────────────
// Inbound: MQTT → Supabase
// ───────────────────────────────────────────────

function handleMessage(topic, message) {
  let payload
  try {
    payload = JSON.parse(message.toString())
  } catch (err) {
    console.error('[MQTT] Failed to parse message:', err.message)
    return
  }

  // Route by topic pattern
  const parts = topic.split('/')

  // smartroom/<roomId>/status — ESP32 booking status updates
  if (parts.length === 3 && parts[2] === 'status') {
    handleRoomStatus(parts[1], payload)
    return
  }

  // smartroom/rooms/<roomId>/sensors — legacy sensor data
  if (parts.length === 4 && parts[1] === 'rooms' && parts[3] === 'sensors') {
    handleSensorMessage(topic, payload)
    return
  }

  console.warn(`[MQTT] Unhandled topic: ${topic}`)
}

/**
 * Handle ESP32 room status messages.
 *
 * Topic:   smartroom/<roomId>/status
 * Payload: { roomId, state: "active"|"ghost_released"|"completed", timestamp }
 *
 * Finds the current scheduled/active booking for that room and
 * updates its status to match.
 */
async function handleRoomStatus(roomId, payload) {
  const { state, timestamp } = payload

  if (!state) {
    console.warn(`[MQTT:Status] Missing state for room ${roomId}`)
    return
  }

  const validStates = ['active', 'ghost_released', 'completed']
  if (!validStates.includes(state)) {
    console.warn(`[MQTT:Status] Invalid state "${state}" for room ${roomId}`)
    return
  }

  const now = timestamp || new Date().toISOString()
  console.log(`[MQTT:Status] Room ${roomId}: state=${state} at ${now}`)

  // Find current scheduled or active booking for this room
  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, status, user_id')
    .eq('room_id', roomId)
    .in('status', ['scheduled', 'active'])
    .lte('start_time', now)
    .gte('end_time', now)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  if (findError || !booking) {
    // No current booking — could be a room with no booking active right now
    console.log(`[MQTT:Status] No active booking found for room ${roomId}`)

    // If ESP32 reports ghost_released, update room occupancy anyway
    if (state === 'ghost_released') {
      await supabase
        .from('rooms')
        .update({ is_occupied: false, last_sensor_ping: now })
        .eq('id', roomId)
    }
    return
  }

  // Update booking status
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: state, updated_at: now })
    .eq('id', booking.id)

  if (updateError) {
    console.error(`[MQTT:Status] Failed to update booking ${booking.id}:`, updateError.message)
    return
  }

  console.log(`[MQTT:Status] Booking ${booking.id} updated to "${state}"`)

  // Update room occupancy based on state
  const isOccupied = state === 'active'
  await supabase
    .from('rooms')
    .update({ is_occupied: isOccupied, last_sensor_ping: now })
    .eq('id', roomId)

  // Log the event
  await supabase.from('activity_log').insert({
    event_type: 'room_status_change',
    room_id: roomId,
    booking_id: booking.id,
    user_id: booking.user_id,
    details: { state, timestamp: now, source: 'esp32' },
  }).then(({ error }) => {
    // Activity log is best-effort — don't fail if table doesn't exist yet
    if (error && !error.message.includes('does not exist')) {
      console.error('[MQTT:Status] Failed to log event:', error.message)
    }
  })
}

// ───────────────────────────────────────────────
// Outbound: Supabase → MQTT
// ───────────────────────────────────────────────

/**
 * Subscribe to Supabase realtime changes on the bookings table.
 * On INSERT or UPDATE, publish to smartroom/<roomId>/booking
 * so ESP32 devices know about booking changes.
 */
function subscribeToBookingChanges() {
  // Remove existing channel if any
  if (supabaseChannel) {
    supabase.removeChannel(supabaseChannel)
  }

  supabaseChannel = supabase
    .channel('booking-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bookings' },
      (payload) => publishBookingToDevice(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bookings' },
      (payload) => publishBookingToDevice(payload.new)
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase RT] Subscribed to booking changes')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Supabase RT] Channel error on booking-changes')
      }
    })
}

/**
 * Publish a booking change to the ESP32 device for that room.
 */
async function publishBookingToDevice(booking) {
  if (!booking || !booking.room_id) return

  // Fetch user display name for the booking
  let userName = null
  if (booking.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', booking.user_id)
      .single()
    userName = profile?.display_name || null
  }

  const topic = `${TOPIC_PREFIX}/${booking.room_id}/booking`
  const payload = {
    bookingId: booking.id,
    userId: booking.user_id,
    userName,
    startTime: booking.start_time,
    endTime: booking.end_time,
    status: booking.status,
  }

  publish(topic, payload)
  console.log(`[MQTT:Out] Published booking ${booking.id} to ${topic}`)
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Publish a JSON message to a topic.
 */
export function publish(topic, payload) {
  if (!client || !client.connected) {
    console.warn('[MQTT] Client not connected, queuing publish skipped')
    return false
  }
  client.publish(topic, JSON.stringify(payload), { qos: 1 })
  return true
}

/**
 * Get the underlying MQTT client (for health checks).
 */
export function getClient() {
  return client
}

/**
 * Initialize the MQTT bridge.
 * Call once from server startup.
 */
export function init() {
  console.log('[MQTT Bridge] Initializing...')
  connect()
  subscribeToBookingChanges()
  console.log('[MQTT Bridge] Initialized')
}

/**
 * Graceful shutdown.
 */
export function shutdown() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (supabaseChannel) {
    supabase.removeChannel(supabaseChannel)
    supabaseChannel = null
  }
  if (client) {
    client.end(false, () => {
      console.log('[MQTT Bridge] Disconnected')
    })
    client = null
  }
}
