import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch profile:', error.message)
        return null
      }
      return data
    } catch {
      return null
    }
  }

  useEffect(() => {
    // Use onAuthStateChange as primary — it fires immediately with
    // INITIAL_SESSION on load, avoiding the getSession() hang issue.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          // Use setTimeout to avoid Supabase deadlock where auth and
          // data requests compete for the same connection during init
          setTimeout(async () => {
            const p = await fetchProfile(currentUser.id)
            setProfile(p)
            setLoading(false)
          }, 0)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    // Safety timeout — if onAuthStateChange never fires, unblock after 3s
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('Auth timeout — forcing load complete')
        return false
      })
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email before signing in. Check your inbox for a confirmation link.')
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid credentials')
      }
      throw new Error('Something went wrong. Please try again.')
    }

    return data
  }, [])

  const signup = useCallback(async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('An account with this email already exists.')
      }
      throw new Error('Something went wrong. Please try again.')
    }

    return data
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({ user, profile, loading, login, signup, logout }),
    [user, profile, loading, login, signup, logout]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
