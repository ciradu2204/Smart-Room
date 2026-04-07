import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns'
import { supabase } from '../lib/supabase'
import { StatusDot } from '../components/ui'
import Skeleton from '../components/ui/Skeleton'
import WeeklyCalendar from '../components/booking/WeeklyCalendar'
import BookingModal from '../components/booking/BookingModal'

function getRoomStatus(bookings) {
  const now = new Date()
  const active = bookings.find(
    (b) =>
      new Date(b.start_time) <= now &&
      new Date(b.end_time) > now &&
      (b.status === 'active' || b.status === 'scheduled')
  )
  if (active) return 'occupied'

  const upcoming = bookings.find((b) => {
    const s = new Date(b.start_time)
    return s > now && s - now <= 30 * 60 * 1000 && (b.status === 'active' || b.status === 'scheduled')
  })
  if (upcoming) return 'upcoming'

  return 'available'
}

const statusLabel = {
  available: 'Available',
  occupied: 'Occupied',
  upcoming: 'Upcoming',
}

const statusTextColor = {
  available: 'text-emerald-600',
  occupied: 'text-rose-600',
  upcoming: 'text-amber-600',
}

export default function RoomDetailPage() {
  const { roomId } = useParams()
  const [room, setRoom] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDay, setModalDay] = useState(null)
  const [modalHour, setModalHour] = useState(null)

  // Fetch room
  useEffect(() => {
    supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()
      .then(({ data }) => {
        setRoom(data)
        setLoadingRoom(false)
      })
  }, [roomId])

  // Fetch bookings — wide range covering ±4 weeks for calendar navigation
  const fetchBookings = useCallback(async () => {
    const rangeStart = startOfWeek(addWeeks(new Date(), -4), { weekStartsOn: 1 })
    const rangeEnd = endOfWeek(addWeeks(new Date(), 4), { weekStartsOn: 1 })

    const { data } = await supabase
      .from('bookings')
      .select('*, profiles!bookings_user_id_profiles_fkey(display_name)')
      .eq('room_id', roomId)
      .gte('start_time', rangeStart.toISOString())
      .lte('end_time', rangeEnd.toISOString())
      .not('status', 'in', '("cancelled","ghost_released")')
      .order('start_time')

    if (data) setBookings(data)
    setLoadingBookings(false)
  }, [roomId])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Realtime subscription for this room's bookings
  useEffect(() => {
    const channel = supabase
      .channel(`room-bookings-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `room_id=eq.${roomId}`,
        },
        () => fetchBookings()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, fetchBookings])

  const status = useMemo(() => getRoomStatus(bookings), [bookings])

  // Bookings for the day the modal targets (for overlap checking)
  const modalDayBookings = useMemo(() => {
    if (!modalDay) return []
    return bookings.filter((b) => {
      const s = new Date(b.start_time)
      return (
        s.getFullYear() === modalDay.getFullYear() &&
        s.getMonth() === modalDay.getMonth() &&
        s.getDate() === modalDay.getDate()
      )
    })
  }, [bookings, modalDay])

  function handleOpenBookingModal(day, hour) {
    setModalDay(day)
    setModalHour(hour)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setModalDay(null)
    setModalHour(null)
  }

  // Loading skeleton
  if (loadingRoom) {
    return (
      <div>
        <Skeleton width="80px" height="0.875rem" className="mb-4" />
        <div className="flex items-center justify-between mb-2">
          <Skeleton width="200px" height="1.75rem" />
          <Skeleton width="80px" height="1rem" />
        </div>
        <div className="flex gap-2 mb-6">
          <Skeleton width="100px" height="0.875rem" />
          <Skeleton width="70px" height="1.25rem" className="!rounded-full" />
          <Skeleton width="90px" height="1.25rem" className="!rounded-full" />
        </div>
        <Skeleton width="100%" height="400px" className="!rounded-lg" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-gray-500">Room not found.</p>
        <Link to="/rooms" className="btn-primary">Back to Rooms</Link>
      </div>
    )
  }

  const features = room.amenities || []

  return (
    <div>
      {/* Back link */}
      <Link
        to="/rooms"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150 mb-4"
      >
        &larr; All Rooms
      </Link>

      {/* Room header */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-semibold text-gray-900">{room.name}</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <StatusDot status={status} />
          <span className={`text-sm ${statusTextColor[status]}`}>
            {statusLabel[status]}
          </span>
        </div>
      </div>

      {/* Capacity + features */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-sm text-gray-500">Capacity: {room.capacity}</span>
        {features.length > 0 && (
          <span className="text-gray-300">|</span>
        )}
        {features.map((f) => (
          <span
            key={f}
            className="bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5"
          >
            {f}
          </span>
        ))}
      </div>

      {/* Weekly calendar */}
      <WeeklyCalendar
        bookings={bookings}
        loading={loadingBookings}
        roomId={roomId}
        roomName={room.name}
        onOpenBookingModal={handleOpenBookingModal}
      />

      {/* Booking modal */}
      <BookingModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        roomName={room.name}
        roomId={roomId}
        selectedDay={modalDay}
        selectedHour={modalHour}
        existingBookings={modalDayBookings}
      />
    </div>
  )
}
