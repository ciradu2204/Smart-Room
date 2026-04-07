import { format } from 'date-fns'
import Skeleton from '../ui/Skeleton'
import { formatTime } from '../../lib/utils'

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton width="80px" height="0.875rem" />
          <Skeleton width="90px" height="0.875rem" />
          <Skeleton width="100px" height="0.875rem" />
          <Skeleton width="70px" height="0.875rem" />
        </div>
      ))}
    </div>
  )
}

export default function GhostBookingLog({ ghostBookings, loading }) {
  if (loading) return <TableSkeleton />

  if (ghostBookings.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No ghost bookings in the last 7 days
      </div>
    )
  }

  const visible = ghostBookings.slice(0, 10)
  const hasMore = ghostBookings.length > 10

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="table-cell text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="table-cell text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
              <th className="table-cell text-xs font-medium text-gray-500 uppercase tracking-wider">Original Booker</th>
              <th className="table-cell text-xs font-medium text-gray-500 uppercase tracking-wider">Released At</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((booking) => (
              <tr key={booking.id} className="border-b border-gray-100">
                <td className="table-cell text-sm text-gray-700">
                  {format(new Date(booking.start_time), 'MMM d')}
                </td>
                <td className="table-cell text-sm text-gray-700">
                  {booking.rooms?.name || '—'}
                </td>
                <td className="table-cell text-sm text-gray-700">
                  {booking.profiles?.display_name || '—'}
                </td>
                <td className="table-cell text-sm text-gray-500">
                  {booking.updated_at
                    ? formatTime(booking.updated_at)
                    : formatTime(booking.end_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-3 text-center">
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors duration-150">
            View all &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
