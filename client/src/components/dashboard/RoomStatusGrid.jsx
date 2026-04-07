import { StatusDot } from '../ui'
import Skeleton from '../ui/Skeleton'
import { formatTime } from '../../lib/utils'

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

function RoomMiniCard({ room, status, currentBooking, nextBooking }) {
  let detail = null

  if (status === 'occupied' && currentBooking) {
    const bookerName = currentBooking.profiles?.display_name || 'Someone'
    detail = (
      <span className="text-xs text-gray-500">
        Until {formatTime(currentBooking.end_time)} &middot; {bookerName}
      </span>
    )
  } else if (status === 'available') {
    if (nextBooking) {
      detail = (
        <span className="text-xs text-gray-400">
          Next booking at {formatTime(nextBooking.start_time)}
        </span>
      )
    } else {
      detail = <span className="text-xs text-gray-400">No bookings today</span>
    }
  } else if (status === 'upcoming' && currentBooking) {
    detail = (
      <span className="text-xs text-gray-500">
        Starts at {formatTime(currentBooking.start_time)}
      </span>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-900">{room.name}</span>
        <div className="flex items-center gap-1">
          <StatusDot status={status} />
          <span className={`text-xs ${statusTextColor[status] || 'text-gray-500'}`}>
            {statusLabel[status] || status}
          </span>
        </div>
      </div>
      {detail}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3">
          <div className="flex justify-between mb-1">
            <Skeleton width="50%" height="0.875rem" />
            <Skeleton width="60px" height="0.75rem" />
          </div>
          <Skeleton width="70%" height="0.75rem" />
        </div>
      ))}
    </div>
  )
}

export default function RoomStatusGrid({ rooms, bookings, loading }) {
  if (loading) return <GridSkeleton />

  const now = new Date()

  const roomItems = rooms.map((room) => {
    const roomBookings = bookings.filter((b) => b.room_id === room.id)

    // Current active booking
    const current = roomBookings.find(
      (b) =>
        new Date(b.start_time) <= now &&
        new Date(b.end_time) > now &&
        (b.status === 'active' || b.status === 'scheduled')
    )

    // Next upcoming booking
    const upcoming = roomBookings.find(
      (b) => new Date(b.start_time) > now && (b.status === 'active' || b.status === 'scheduled')
    )

    let status = 'available'
    let currentBooking = null

    if (current) {
      status = 'occupied'
      currentBooking = current
    } else if (upcoming && new Date(upcoming.start_time) - now <= 30 * 60 * 1000) {
      status = 'upcoming'
      currentBooking = upcoming
    }

    return { room, status, currentBooking, nextBooking: current ? null : upcoming }
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {roomItems.map(({ room, status, currentBooking, nextBooking }) => (
        <RoomMiniCard
          key={room.id}
          room={room}
          status={status}
          currentBooking={currentBooking}
          nextBooking={nextBooking}
        />
      ))}
    </div>
  )
}
