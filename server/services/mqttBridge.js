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
    // TLS support for cloud brokers (mqtts:// URLs)
    rejectUnauthorized: true,
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

  // 2. Walk-up booking events: smartroom/+/walk-up
  client.subscribe(`${TOPIC_PREFIX}/+/walk-up`, (err) => {
    if (err) console.error('[MQTT] Subscribe error (walk-up):', err.message)
    else console.log(`[MQTT] Subscribed to ${TOPIC_PREFIX}/+/walk-up`)
  })

  // 3. Legacy sensor topic (kept for backwards compat)
  client.subscribe(`${TOPIC_PREFIX}/rooms/+/sensors`, (err) => {
    if (err) console.error('[MQTT] Subscribe error (sensors):', err.message)
    else console.log(`[MQTT] Subscribed to ${TOPIC_PREFIX}/rooms/+/sensors`)
  })

  // 3. On every (re)connect, refresh the per-room snapshots so any device
  // that joins after a broker restart gets a current upcoming-bookings list.
  refreshAllRoomSnapshots().catch((err) =>
    console.error('[MQTT] Snapshot refresh on connect failed:', err.message)
  )
}

/**
 * Iterate every known room and publish its upcoming-bookings snapshot.
 * Called on broker (re)connect and on server startup.
 */
async function refreshAllRoomSnapshots() {
  const { data: rooms, error } = await supabase.from('rooms').select('id')
  if (error) {
    console.error('[MQTT:Snapshot] Failed to list rooms:', error.message)
    return
  }
  for (const r of rooms || []) {
    await publishRoomSnapshot(r.id)
  }
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

  // smartroom/<roomId>/walk-up — ESP32 walk-up booking creation
  if (parts.length === 3 && parts[2] === 'walk-up') {
    handleWalkUpBooking(parts[1], payload)
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
 * Handle walk-up booking creation from the ESP32.
 *
 * Topic:   smartroom/<roomId>/walk-up
 * Payload: { roomId, bookingId, title, occupantName, startTime, endTime, timestamp }
 *
 * startTime/endTime are epoch seconds already shifted by +7200 (Kigali) on
 * the device, so we subtract KIGALI_OFFSET_SECONDS to get true UTC epoch
 * for the DB INSERT.
 *
 * The booking is attributed to WALK_UP_USER_ID (admin service account)
 * since the panel has no per-user auth. The title carries the purpose
 * picked on the panel so walk-ups remain distinguishable in the DB.
 */
async function handleWalkUpBooking(roomId, payload) {
  const { bookingId, title, startTime, endTime } = payload || {}
  if (!bookingId || !startTime || !endTime) {
    console.warn(`[MQTT:WalkUp] Missing fields for room ${roomId}`)
    return
  }

  const startUtc = new Date((startTime - KIGALI_OFFSET_SECONDS) * 1000).toISOString()
  const endUtc   = new Date((endTime   - KIGALI_OFFSET_SECONDS) * 1000).toISOString()

  const row = {
    room_id: roomId,
    user_id: WALK_UP_USER_ID,
    title: title || 'Walk-up booking',
    start_time: startUtc,
    end_time: endUtc,
    status: 'active',
  }

  const { error: insertError } = await supabase.from('bookings').insert(row)
  if (insertError) {
    console.error(`[MQTT:WalkUp] Insert failed for ${bookingId}:`, insertError.message)
    return
  }

  console.log(`[MQTT:WalkUp] Inserted walk-up ${bookingId} (${title}) for room ${roomId}`)

  // Mark room occupied and refresh snapshot
  await supabase
    .from('rooms')
    .update({ is_occupied: true, last_sensor_ping: new Date().toISOString() })
    .eq('id', roomId)

  await publishRoomSnapshot(roomId)
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

  // Use the server's current UTC time for queries — the ESP32's timestamp
  // is only used for logging. The ESP32 sends Kigali-local epoch seconds
  // which can't be reliably converted without knowing the offset, and for
  // "is a booking active right now" we only need server time anyway.
  const nowIso = new Date().toISOString()
  console.log(`[MQTT:Status] Room ${roomId}: state=${state} (esp32 ts=${timestamp}, server=${nowIso})`)

  // Find the booking the ESP32 is reporting about. For "completed" events
  // the booking's end_time is already in the past by the time we process
  // the message, so we drop the end_time filter and take the most recent
  // active booking whose start_time <= now. For "active" / "ghost_released"
  // we still require end_time >= now.
  let query = supabase
    .from('bookings')
    .select('id, status, user_id')
    .eq('room_id', roomId)
    .in('status', ['scheduled', 'active'])
    .lte('start_time', nowIso)
    .order('start_time', { ascending: false })
    .limit(1)
  if (state !== 'completed') {
    query = query.gte('end_time', nowIso)
  }
  const { data: booking, error: findError } = await query.single()

  if (findError || !booking) {
    // No current booking — could be a room with no booking active right now
    console.log(`[MQTT:Status] No active booking found for room ${roomId}`)

    // If ESP32 reports ghost_released, update room occupancy anyway
    if (state === 'ghost_released') {
      await supabase
        .from('rooms')
        .update({ is_occupied: false, last_sensor_ping: nowIso })
        .eq('id', roomId)
    }
    return
  }

  // Update booking status
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: state, updated_at: nowIso })
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
    .update({ is_occupied: isOccupied, last_sensor_ping: nowIso })
    .eq('id', roomId)

  // Log the event
  await supabase.from('activity_log').insert({
    event_type: 'room_status_change',
    room_id: roomId,
    booking_id: booking.id,
    user_id: booking.user_id,
    details: { state, timestamp: nowIso, source: 'esp32' },
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
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'bookings' },
      async (payload) => {
        // payload.old carries the deleted row. Refresh the snapshot for that
        // room so the ESP32 drops the deleted booking from its slot table.
        // Without this, a DB-level delete (admin action, test harness cleanup,
        // cascaded deletes) leaves the ESP32 still showing the booking as
        // reserved/active even though the dashboard has moved on.
        const roomId = payload.old?.room_id
        if (!roomId) return
        console.log(`[Supabase RT] DELETE booking ${payload.old.id} from room ${roomId} — refreshing snapshot`)
        await publishRoomSnapshot(roomId)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase RT] Subscribed to booking changes')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Supabase RT] Channel error on booking-changes')
      }
    })
}

// Kigali is UTC+2 (Central Africa Time, no DST)
const KIGALI_OFFSET_SECONDS = 2 * 60 * 60

// Fallback user_id for walk-up bookings created at the physical panel.
// The panel has no auth flow, so every walk-up is attributed to this admin
// service account. Override via env var in production.
const WALK_UP_USER_ID =
  process.env.WALK_UP_ADMIN_USER_ID || '55867559-cedf-4152-b3f8-77f6d3edf198'

function bookingToWirePayload(booking, userName) {
  // Convert ISO strings to Unix epoch seconds, shifted to Kigali local time
  // so the ESP32 can use the values directly without timezone math.
  const startEpoch = Math.floor(new Date(booking.start_time).getTime() / 1000) + KIGALI_OFFSET_SECONDS
  const endEpoch   = Math.floor(new Date(booking.end_time).getTime()   / 1000) + KIGALI_OFFSET_SECONDS
  // Keep the wire format tight — the ESP32 doesn't use userId or timezone,
  // and trimming those is essential when the snapshot packs 20+ bookings
  // into a single MQTT message (PubSubClient silently drops oversized
  // payloads). title is an empty string instead of null so the ESP32 JSON
  // parser sees the key reliably.
  return {
    bookingId: booking.id,
    userName: userName || '',
    title: booking.title || '',
    startTime: startEpoch,
    endTime: endEpoch,
    status: booking.status,
  }
}

async function fetchUserName(userId) {
  if (!userId) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()
  return profile?.display_name || null
}

/**
 * Publish the full set of upcoming bookings for a room as a single retained
 * snapshot. ESP32 devices subscribe to this topic and rebuild their slot table
 * whenever a snapshot arrives — so a fresh boot or a calendar open immediately
 * shows the day's bookings instead of starting empty.
 */
async function publishRoomSnapshot(roomId) {
  if (!roomId) return

  const nowIso = new Date().toISOString()
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, user_id, title, start_time, end_time, status')
    .eq('room_id', roomId)
    .in('status', ['scheduled', 'active'])
    .gte('end_time', nowIso)
    .order('start_time', { ascending: true })
    .limit(20)

  if (error) {
    console.error(`[MQTT:Snapshot] Failed to fetch bookings for ${roomId}:`, error.message)
    return
  }

  const items = []
  for (const b of bookings || []) {
    const userName = await fetchUserName(b.user_id)
    items.push(bookingToWirePayload(b, userName))
  }

  const topic = `${TOPIC_PREFIX}/${roomId}/bookings/snapshot`
  publish(topic, { roomId, generatedAt: nowIso, bookings: items })
  console.log(`[MQTT:Snapshot] Published ${items.length} bookings to ${topic}`)
}

/**
 * Publish a booking change to the ESP32 device for that room.
 */
async function publishBookingToDevice(booking) {
  if (!booking || !booking.room_id) return

  const userName = await fetchUserName(booking.user_id)
  const topic = `${TOPIC_PREFIX}/${booking.room_id}/booking`
  publish(topic, bookingToWirePayload(booking, userName))
  console.log(`[MQTT:Out] Published booking ${booking.id} to ${topic}`)

  // Refresh the per-room snapshot so the ESP32's local calendar stays in sync
  // with the database for the whole upcoming-bookings list.
  await publishRoomSnapshot(booking.room_id)
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Publish a JSON message to a topic.
 *
 * Booking topics are published with `retain: true` so that an ESP32 joining
 * the broker mid-stream immediately receives the latest booking state for its
 * room. Without retention a freshly-booted device has no way to learn about
 * existing bookings until the next INSERT/UPDATE fires.
 */
export function publish(topic, payload) {
  if (!client || !client.connected) {
    console.warn('[MQTT] Client not connected, queuing publish skipped')
    return false
  }
  const retain = topic.endsWith('/booking') || topic.endsWith('/bookings/snapshot')
  client.publish(topic, JSON.stringify(payload), { qos: 1, retain })
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
