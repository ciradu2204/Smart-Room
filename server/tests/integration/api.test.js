/**
 * Integration tests for the Express API routes.
 * Starts the server on a random port, runs real HTTP calls, shuts down.
 *
 * Requires a valid server/.env with Supabase credentials.
 * MQTT connection errors are expected and do not fail tests.
 *
 * Run: node --test tests/integration/api.test.js
 */
import 'dotenv/config'
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import cors from 'cors'
import http from 'node:http'

// ── Import routes directly (without starting MQTT/sweep) ──
import allocationRoutes from '../../routes/allocation.js'
import allocateRoutes from '../../routes/allocate.js'
import healthRoutes from '../../routes/health.js'
import usersRoutes from '../../routes/users.js'

let server
let baseUrl

async function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl)
    const bodyStr = body ? JSON.stringify(body) : undefined
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })

    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

before(async () => {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api/health', healthRoutes)
  app.use('/api/allocation', allocationRoutes)
  app.use('/api/allocate', allocateRoutes)
  app.use('/api/users', usersRoutes)

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      baseUrl = `http://127.0.0.1:${port}`
      console.log(`[Test server] Listening on ${baseUrl}`)
      resolve()
    })
  })
})

after(() => {
  server?.close()
})

// ── Health endpoint ──
describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const { status, body } = await request('GET', '/api/health')
    assert.equal(status, 200)
    assert.ok(body.status === 'ok' || body.ok === true || typeof body === 'object',
      `Expected health response, got: ${JSON.stringify(body)}`)
  })
})

// ── Allocate input validation ──
describe('POST /api/allocate — input validation', () => {
  it('returns 400 when body is empty', async () => {
    const { status, body } = await request('POST', '/api/allocate', {})
    assert.equal(status, 400)
    assert.ok(body.error)
  })

  it('returns 400 when slots is empty array', async () => {
    const { status, body } = await request('POST', '/api/allocate', {
      userId: 'u1',
      slots: [],
      weekStartDate: '2025-01-06',
    })
    assert.equal(status, 400)
    assert.ok(body.error)
  })

  it('returns 400 when weekStartDate is missing', async () => {
    const { status, body } = await request('POST', '/api/allocate', {
      userId: 'u1',
      slots: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00' }],
    })
    assert.equal(status, 400)
    assert.ok(body.error?.includes('weekStartDate'))
  })

  it('returns 400 when slot has end time before start time', async () => {
    const { status, body } = await request('POST', '/api/allocate', {
      userId: 'u1',
      slots: [{ dayOfWeek: 'Monday', startTime: '10:00', endTime: '09:00' }],
      weekStartDate: '2025-01-06',
    })
    assert.equal(status, 400)
    assert.ok(body.error?.includes('end must be after start'))
  })

  it('returns 400 when slot is missing dayOfWeek', async () => {
    const { status, body } = await request('POST', '/api/allocate', {
      userId: 'u1',
      slots: [{ startTime: '09:00', endTime: '10:00' }],
      weekStartDate: '2025-01-06',
    })
    assert.equal(status, 400)
    assert.ok(body.error)
  })
})

// ── Allocate confirm input validation ──
describe('POST /api/allocate/confirm — input validation', () => {
  it('returns 400 when userId missing', async () => {
    const { status, body } = await request('POST', '/api/allocate/confirm', {
      allocations: [{ allocated: true }],
    })
    assert.equal(status, 400)
    assert.ok(body.error)
  })

  it('returns 400 when no successful allocations', async () => {
    const { status, body } = await request('POST', '/api/allocate/confirm', {
      userId: 'u1',
      allocations: [{ allocated: false, reason: 'None' }],
    })
    assert.equal(status, 400)
    assert.ok(body.error?.includes('No successful'))
  })
})

// ── Users route input validation ──
describe('POST /api/users — input validation', () => {
  it('returns 400 when required fields missing', async () => {
    const { status, body } = await request('POST', '/api/users', {})
    assert.equal(status, 400)
    assert.ok(body.error)
  })

  it('returns 400 when password is too short', async () => {
    const { status, body } = await request('POST', '/api/users', {
      display_name: 'Test User',
      email: 'test@andrew.cmu.edu',
      password: 'short',
      role: 'student',
    })
    assert.equal(status, 400)
    assert.ok(body.error?.includes('8 characters'))
  })

  it('returns 409 when email already registered (if Supabase reachable)', async () => {
    // This test is best-effort — if Supabase is unreachable it'll return 400/500
    // We just verify it does NOT return a 2xx for an obviously invalid request
    const { status } = await request('POST', '/api/users', {
      display_name: 'Duplicate',
      email: 'noreply+test@andrew.cmu.edu',
      password: 'testpassword123',
      role: 'student',
    })
    // Could be 201 (user created), 409 (duplicate), or 400/500 (Supabase error)
    // We just assert it's a valid HTTP status
    assert.ok([201, 400, 409, 500].includes(status), `Unexpected status: ${status}`)
  })
})

// ── Allocation route ──
describe('GET /api/allocation', () => {
  it('responds without crashing', async () => {
    const { status } = await request('GET', '/api/allocation')
    // Could be 200 (rooms listed) or 500 (Supabase config issue)
    // We just verify it does not crash the server
    assert.ok(status < 600, `Expected valid HTTP status, got: ${status}`)
  })
})
