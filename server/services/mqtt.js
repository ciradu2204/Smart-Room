import mqtt from 'mqtt'
import { handleSensorMessage } from './sensorHandler.js'

let client = null

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'smartroom'

export function connectMqtt() {
  const options = {}
  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME
    options.password = process.env.MQTT_PASSWORD
  }

  client = mqtt.connect(BROKER_URL, options)

  client.on('connect', () => {
    console.log(`[MQTT] Connected to ${BROKER_URL}`)

    // Subscribe to sensor topics
    // Pattern: smartroom/rooms/{roomId}/sensors
    client.subscribe(`${TOPIC_PREFIX}/rooms/+/sensors`, (err) => {
      if (err) console.error('[MQTT] Subscribe error:', err)
      else console.log(`[MQTT] Subscribed to ${TOPIC_PREFIX}/rooms/+/sensors`)
    })
  })

  client.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString())
      handleSensorMessage(topic, payload)
    } catch (err) {
      console.error('[MQTT] Failed to parse message:', err.message)
    }
  })

  client.on('error', (err) => {
    console.error('[MQTT] Connection error:', err.message)
  })

  return client
}

export function publishMessage(topic, payload) {
  if (!client || !client.connected) {
    console.warn('[MQTT] Client not connected, cannot publish')
    return
  }
  client.publish(topic, JSON.stringify(payload))
}

export function getMqttClient() {
  return client
}
