import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetch bookings for a given room or user.
 * Pass { roomId } or { userId } to filter.
 */
export function useBookings({ roomId, userId } = {}) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [roomId, userId])

  async function fetchBookings() {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('bookings')
      .select('*, rooms(name, floor)')
      .order('start_time', { ascending: true })

    if (roomId) query = query.eq('room_id', roomId)
    if (userId) query = query.eq('user_id', userId)

    const { data, error: err } = await query

    if (err) setError(err.message)
    else setBookings(data || [])
    setLoading(false)
  }

  async function createBooking(booking) {
    const { data, error: err } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single()

    if (err) throw err
    setBookings((prev) => [...prev, data])
    return data
  }

  async function cancelBooking(id) {
    const { error: err } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (err) throw err
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
    )
  }

  return { bookings, loading, error, createBooking, cancelBooking, refetch: fetchBookings }
}
