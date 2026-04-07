import { formatTime } from '../../lib/utils'

const styles = {
  mine: 'bg-emerald-50 border-l-2 border-emerald-600',
  others: 'bg-rose-50 border-l-2 border-rose-400',
  ghost: 'bg-gray-50 border-l-2 border-gray-300',
}

export default function BookingBlock({ booking, isMine, startHour }) {
  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)
  const isGhost = booking.status === 'ghost_released'

  // Position within the grid: each hour = 60px
  const topMinutes = start.getHours() * 60 + start.getMinutes() - startHour * 60
  const durationMinutes = (end - start) / 60000
  const top = (topMinutes / 60) * 60
  const height = Math.max((durationMinutes / 60) * 60, 20)

  let variant = 'others'
  if (isGhost) variant = 'ghost'
  else if (isMine) variant = 'mine'

  const bookerName = booking.profiles?.display_name || 'Someone'
  const label = isMine ? 'You' : bookerName
  const bookingTitle = booking.title || ''

  return (
    <div
      className={`absolute left-0.5 right-0.5 rounded px-1.5 py-1 overflow-hidden z-10 ${styles[variant]}`}
      style={{ top: `${top}px`, height: `${height}px` }}
      title={`${label} · ${bookingTitle} · ${formatTime(start)} – ${formatTime(end)}`}
    >
      <p
        className={`text-xs leading-tight truncate font-medium ${
          isGhost ? 'line-through text-gray-400' : 'text-gray-700'
        }`}
      >
        {label}
      </p>
      {height >= 36 && bookingTitle && (
        <p className={`text-xs leading-tight truncate ${isGhost ? 'text-gray-300' : 'text-gray-500'}`}>
          {bookingTitle}
        </p>
      )}
      {height >= 52 && (
        <p className={`text-xs leading-tight ${isGhost ? 'text-gray-300' : 'text-gray-400'}`}>
          {formatTime(start)} – {formatTime(end)}
        </p>
      )}
    </div>
  )
}
