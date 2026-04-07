import { useCallback, useEffect, useMemo, useState } from 'react'
import { startOfDay, endOfDay } from 'date-fns'
import { supabase } from '../lib/supabase'
import RoomCard from '../components/rooms/RoomCard'
import RoomFilters from '../components/rooms/RoomFilters'
import Skeleton from '../components/ui/Skeleton'

const UPCOMING_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

function getRoomStatus(room, bookings, now) {
  const roomBookings = bookings.filter((b) => b.room_id === room.id)

  // Check for currently active booking
  const active = roomBookings.find(
    (b) =>
      new Date(b.start_time) <= now &&
      new Date(b.end_time) > now &&
      (b.status === 'active' || b.status === 'scheduled')
  )
  if (active) return { status: 'occupied', currentBooking: active }

  // Check for upcoming booking within 30 minutes
  const upcoming = roomBookings.find((b) => {
    const start = new Date(b.start_time)
    return (
      start > now &&
      start - now <= UPCOMING_THRESHOLD_MS &&
      (b.status === 'active' || b.status === 'scheduled')
    )
  })
  if (upcoming) return { status: 'upcoming', currentBooking: upcoming }

  return { status: 'available', currentBooking: null }
}

function parseCapacityFilter(value) {
  if (!value) return null
  if (value === '20+') return { min: 21, max: Infinity }
  const [min, max] = value.split('-').map(Number)
  return { min, max }
}

function RoomSkeleton() {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton width="55%" height="1.25rem" />
        <Skeleton width="70px" height="0.875rem" />
      </div>
      <Skeleton width="35%" height="0.875rem" />
      <div className="flex gap-1.5">
        <Skeleton width="64px" height="1.25rem" className="!rounded-full" />
        <Skeleton width="80px" height="1.25rem" className="!rounded-full" />
        <Skeleton width="56px" height="1.25rem" className="!rounded-full" />
      </div>
      <div className="border-t border-gray-100 pt-3 mt-1">
        <Skeleton width="100px" height="0.875rem" />
      </div>
    </div>
  )
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'All', capacity: '' })
  const [now, setNow] = useState(() => new Date())

  const fetchData = useCallback(async () => {
    const today = new Date()
    const todayStart = startOfDay(today).toISOString()
    const todayEnd = endOfDay(today).toISOString()

    const [roomsRes, bookingsRes] = await Promise.all([
      supabase.from('rooms').select('*').order('name'),
      supabase
        .from('bookings')
        .select('*')
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .not('status', 'in', '("cancelled","ghost_released")'),
    ])

    if (roomsRes.data) setRooms(roomsRes.data)
    if (bookingsRes.data) setBookings(bookingsRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh "now" every minute so status transitions happen live
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Real-time subscription to booking changes
  useEffect(() => {
    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          // Re-fetch bookings on any change to re-evaluate statuses
          const today = new Date()
          const todayStart = startOfDay(today).toISOString()
          const todayEnd = endOfDay(today).toISOString()

          supabase
            .from('bookings')
            .select('*')
            .gte('start_time', todayStart)
            .lte('start_time', todayEnd)
            .not('status', 'in', '("cancelled","ghost_released")')
            .then(({ data }) => {
              if (data) {
                setBookings(data)
                setNow(new Date())
              }
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Compute statuses for all rooms
  const roomsWithStatus = useMemo(
    () =>
      rooms.map((room) => ({
        room,
        ...getRoomStatus(room, bookings, now),
      })),
    [rooms, bookings, now]
  )

  // Apply filters
  const filteredRooms = useMemo(() => {
    let result = roomsWithStatus

    // Status filter
    if (filters.status === 'Available') {
      result = result.filter((r) => r.status === 'available')
    } else if (filters.status === 'Occupied') {
      result = result.filter((r) => r.status === 'occupied' || r.status === 'upcoming')
    }

    // Capacity filter
    const cap = parseCapacityFilter(filters.capacity)
    if (cap) {
      result = result.filter(
        (r) => r.room.capacity >= cap.min && r.room.capacity <= cap.max
      )
    }

    return result
  }, [roomsWithStatus, filters])

  function clearFilters() {
    setFilters({ status: 'All', capacity: '' })
  }

  if (loading) {
    return (
      <div>
        <Skeleton width="80px" height="1.75rem" className="mb-2" />
        <Skeleton width="260px" height="0.875rem" className="mb-4" />
        <div className="flex gap-3 mb-4">
          <Skeleton width="50px" height="2rem" className="!rounded-full" />
          <Skeleton width="80px" height="2rem" className="!rounded-full" />
          <Skeleton width="76px" height="2rem" className="!rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <RoomSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-semibold text-gray-900">Rooms</h1>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Select a room to view availability and book
      </p>

      {/* Filters */}
      <div className="mb-4">
        <RoomFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Grid or empty state */}
      {filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-500">No rooms match your filters</p>
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 mt-2 transition-colors duration-150"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map(({ room, status, currentBooking }) => (
            <RoomCard
              key={room.id}
              room={room}
              status={status}
              currentBooking={currentBooking}
            />
          ))}
        </div>
      )}
    </div>
  )
}
