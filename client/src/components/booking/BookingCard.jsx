import { format } from 'date-fns'
import { Button } from '../ui'
import { formatTime } from '../../lib/utils'

const statusConfig = {
  scheduled: { label: 'Scheduled', className: 'bg-emerald-50 text-emerald-700' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-400 line-through' },
  ghost_released: { label: 'Ghost Released', className: 'bg-amber-50 text-amber-700' },
}

export default function BookingCard({
  booking,
  isPast,
  isAdmin,
  onEdit,
  onCancel,
}) {
  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)
  const status = statusConfig[booking.status] || statusConfig.scheduled
  // Can cancel if not past AND status is scheduled or active (ongoing)
  const isCancellable = !isPast && ['scheduled', 'active'].includes(booking.status)

  const roomName = booking.rooms?.name || 'Room'
  const floor = booking.rooms?.floor
  const locationStr = floor ? `Floor ${floor}` : null

  return (
    <div
      className={`border border-gray-200 rounded-lg p-4 bg-white ${
        isPast ? 'opacity-75' : ''
      }`}
    >
      {/* Row 1: Room name + status badge */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <h3 className="text-base font-semibold text-gray-900 truncate">
          {roomName}
        </h3>
        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Row 2: Date/time + location + title */}
      <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
        <span className="text-gray-600">
          {format(start, 'EEE, MMM d')} &middot; {formatTime(start)} – {formatTime(end)}
        </span>
        {locationStr && (
          <span className="text-gray-400">&middot; {locationStr}</span>
        )}
        {booking.title && (
          <span className="text-gray-400">&middot; {booking.title}</span>
        )}
      </div>

      {/* Admin: booker info */}
      {isAdmin && booking.profiles && (
        <p className="text-xs text-gray-400 mt-1">
          Booked by {booking.profiles.display_name || 'Unknown'}{' '}
          ({booking.profiles.role || 'user'})
        </p>
      )}

      {/* Actions */}
      {isCancellable && (onEdit || onCancel) && (
        <div className="flex gap-2 mt-3">
          {/* Edit only makes sense for future scheduled bookings, not ongoing */}
          {onEdit && booking.status === 'scheduled' && new Date(booking.start_time) > new Date() && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(booking)}
            >
              Edit
            </Button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(booking)}
              className="btn-secondary text-sm px-3 py-1.5 !text-rose-600 !border-rose-200 hover:!bg-rose-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
}
