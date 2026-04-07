import { Link } from 'react-router-dom'
import { StatusDot } from '../ui'
import { formatTime } from '../../lib/utils'

const statusText = {
  available: 'Available',
  occupied: 'Occupied',
  upcoming: 'Upcoming',
}

const statusTextColor = {
  available: 'text-emerald-600',
  occupied: 'text-rose-600',
  upcoming: 'text-amber-600',
}

const MAX_VISIBLE_FEATURES = 3

export default function RoomCard({ room, status, currentBooking }) {
  const features = room.amenities || []
  const visibleFeatures = features.slice(0, MAX_VISIBLE_FEATURES)
  const overflowCount = features.length - MAX_VISIBLE_FEATURES

  return (
    <Link
      to={`/rooms/${room.id}`}
      className="card block hover:border-gray-300 transition-colors duration-150"
    >
      {/* Header: name + status */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
        <div className="flex items-center gap-1.5">
          <StatusDot status={status} />
          <span className={`text-sm ${statusTextColor[status] || 'text-gray-500'}`}>
            {statusText[status] || status}
          </span>
        </div>
      </div>

      {/* Capacity */}
      <p className="text-sm text-gray-500 mb-3">Capacity: {room.capacity}</p>

      {/* Features */}
      {features.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {visibleFeatures.map((f) => (
            <span
              key={f}
              className="bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5"
            >
              {f}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="text-xs text-gray-400 py-0.5">
              +{overflowCount} more
            </span>
          )}
        </div>
      )}

      {/* Occupied info */}
      {status === 'occupied' && currentBooking && (
        <p className="text-xs text-gray-400 mb-3">
          Booked by {currentBooking.booker_name || 'Someone'} until{' '}
          {formatTime(currentBooking.end_time)}
        </p>
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 pt-3 mt-3">
        <span className="text-sm font-medium text-emerald-600">
          View schedule &rarr;
        </span>
      </div>
    </Link>
  )
}
