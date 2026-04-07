import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
    'Copy .env.example to .env and fill in your credentials.'
  )
}

// Service role client — bypasses RLS. Use only on the server.
export const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  { auth: { persistSession: false } }
)
