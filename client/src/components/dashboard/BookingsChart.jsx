import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import Skeleton from '../ui/Skeleton'

export default function BookingsChart({ rooms, bookings, loading }) {
  const data = useMemo(() => {
    if (!rooms.length) return []

    return rooms
      .map((room) => ({
        name: room.name,
        bookings: bookings.filter((b) => b.room_id === room.id).length,
      }))
      .filter((d) => d.bookings > 0)
      .sort((a, b) => b.bookings - a.bookings)
  }, [rooms, bookings])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton width="80px" height="0.75rem" />
            <Skeleton width={`${60 - i * 10}%`} height="1.5rem" />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        No bookings this week
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 200)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <Tooltip
          contentStyle={{
            fontSize: 13,
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            boxShadow: 'none',
          }}
          formatter={(value) => [`${value} booking${value !== 1 ? 's' : ''}`, 'Count']}
        />
        <Bar dataKey="bookings" fill="#d1d5db" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
