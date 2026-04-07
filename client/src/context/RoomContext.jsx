import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const RoomContext = createContext(null)

export function RoomProvider({ children }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRooms()

    // Subscribe to real-time room updates
    const channel = supabase
      .channel('rooms-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          setRooms((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((r) => r.id !== payload.old.id)
            }
            const updated = payload.new
            const exists = prev.find((r) => r.id === updated.id)
            if (exists) {
              return prev.map((r) => (r.id === updated.id ? updated : r))
            }
            return [...prev, updated]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchRooms() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name')

    if (!error) setRooms(data || [])
    setLoading(false)
  }

  return (
    <RoomContext.Provider value={{ rooms, loading, refetch: fetchRooms }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRooms() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRooms must be used within <RoomProvider>')
  return ctx
}
