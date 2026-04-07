import { Router } from 'express'
import { supabase } from '../services/supabaseAdmin.js'

const router = Router()

/**
 * POST /api/users
 * Body: { display_name, email, password, role }
 * Creates a new user via Supabase Admin API, then sets their profile role.
 */
router.post('/', async (req, res) => {
  try {
    const { display_name, email, password, role } = req.body

    if (!display_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const validRoles = ['student', 'faculty']
    const userRole = validRoles.includes(role) ? role : 'student'

    // Create user via Supabase Admin API (bypasses email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return res.status(409).json({ error: 'A user with this email already exists.' })
      }
      return res.status(400).json({ error: authError.message })
    }

    // Update role in profiles table (trigger creates with 'student' default)
    if (userRole !== 'student') {
      await supabase
        .from('profiles')
        .update({ role: userRole })
        .eq('id', authData.user.id)
    }

    res.status(201).json({
      id: authData.user.id,
      email,
      display_name,
      role: userRole,
    })
  } catch (err) {
    console.error('[Users] Create error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
