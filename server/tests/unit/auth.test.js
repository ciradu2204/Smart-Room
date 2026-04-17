/**
 * Unit tests for auth validation logic (domain check, password rules).
 * Mirrors the guards in AuthContext and the /api/users route.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ── Mirrors AuthContext signup domain guard ──
function isValidCmuEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@andrew.cmu.edu')
}

// ── Mirrors /api/users password guard ──
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8
}

// ── Mirrors /api/users role guard ──
function resolveRole(role) {
  return ['student', 'faculty'].includes(role) ? role : 'student'
}

// ── Mirrors AuthContext error message mapping ──
function mapAuthError(message) {
  if (message.includes('Email not confirmed'))
    return 'Please confirm your email before signing in. Check your inbox for a confirmation link.'
  if (message.includes('Invalid login credentials'))
    return 'Invalid credentials'
  return 'Something went wrong. Please try again.'
}

describe('isValidCmuEmail', () => {
  it('accepts valid @andrew.cmu.edu address', () => {
    assert.ok(isValidCmuEmail('student@andrew.cmu.edu'))
  })

  it('accepts mixed-case @andrew.cmu.edu', () => {
    assert.ok(isValidCmuEmail('Student@ANDREW.CMU.EDU'))
  })

  it('rejects @gmail.com', () => {
    assert.ok(!isValidCmuEmail('user@gmail.com'))
  })

  it('rejects @cmu.edu (missing andrew)', () => {
    assert.ok(!isValidCmuEmail('user@cmu.edu'))
  })

  it('rejects empty string', () => {
    assert.ok(!isValidCmuEmail(''))
  })

  it('rejects non-string', () => {
    assert.ok(!isValidCmuEmail(null))
    assert.ok(!isValidCmuEmail(undefined))
  })

  it('rejects spoofed domain (andrew.cmu.edu.evil.com)', () => {
    assert.ok(!isValidCmuEmail('user@andrew.cmu.edu.evil.com'))
  })
})

describe('isValidPassword', () => {
  it('accepts 8-character password', () => {
    assert.ok(isValidPassword('12345678'))
  })

  it('accepts password longer than 8 characters', () => {
    assert.ok(isValidPassword('supersecurepassword'))
  })

  it('rejects 7-character password', () => {
    assert.ok(!isValidPassword('1234567'))
  })

  it('rejects empty string', () => {
    assert.ok(!isValidPassword(''))
  })

  it('rejects non-string', () => {
    assert.ok(!isValidPassword(null))
  })
})

describe('resolveRole', () => {
  it('returns student for "student"', () => assert.equal(resolveRole('student'), 'student'))
  it('returns faculty for "faculty"', () => assert.equal(resolveRole('faculty'), 'faculty'))
  it('defaults unknown role to student', () => assert.equal(resolveRole('admin'), 'student'))
  it('defaults null to student', () => assert.equal(resolveRole(null), 'student'))
  it('defaults undefined to student', () => assert.equal(resolveRole(undefined), 'student'))
  it('defaults empty string to student', () => assert.equal(resolveRole(''), 'student'))
})

describe('mapAuthError', () => {
  it('maps Email not confirmed correctly', () => {
    const msg = mapAuthError('Email not confirmed')
    assert.ok(msg.includes('confirm your email'))
  })

  it('maps Invalid login credentials correctly', () => {
    const msg = mapAuthError('Invalid login credentials')
    assert.equal(msg, 'Invalid credentials')
  })

  it('maps unknown errors to generic message', () => {
    const msg = mapAuthError('Some unexpected error from Supabase')
    assert.equal(msg, 'Something went wrong. Please try again.')
  })
})
