import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Subscribe to real-time updates for a single room.
 * Returns current room state, updated live via Supabase Realtime.
 */
export function useRealtimeRoom(roomId) {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId) return

    // Initial fetch
    supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()
      .then(({ data }) => {
        setRoom(data)
        setLoading(false)
      })

    // Real-time subscription
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => setRoom(payload.new)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  return { room, loading }
}
