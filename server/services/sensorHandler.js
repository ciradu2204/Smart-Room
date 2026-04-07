import { supabase } from './supabaseAdmin.js'

/**
 * Handle incoming MQTT sensor messages.
 *
 * Expected topic:  smartroom/rooms/{roomId}/sensors
 * Expected payload: { occupancy: boolean, temperature?: number, timestamp: string }
 */
export async function handleSensorMessage(topic, payload) {
  // Extract roomId from topic: smartroom/rooms/{roomId}/sensors
  const parts = topic.split('/')
  const roomId = parts[2]

  if (!roomId) {
    console.warn('[Sensor] Could not extract roomId from topic:', topic)
    return
  }

  const { occupancy, temperature, timestamp } = payload

  console.log(`[Sensor] Room ${roomId}: occupancy=${occupancy}, temp=${temperature}`)

  // Update room sensor data in Supabase
  const { error } = await supabase
    .from('rooms')
    .update({
      is_occupied: occupancy,
      last_sensor_ping: timestamp || new Date().toISOString(),
      ...(temperature != null && { temperature }),
    })
    .eq('id', roomId)

  if (error) {
    console.error('[Sensor] Failed to update room:', error.message)
  }

  // TODO: Trigger ghost-release check if room was booked but unoccupied
}
