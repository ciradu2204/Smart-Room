import { useCallback, useEffect, useMemo, useState } from 'react'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import RoleGate from '../components/auth/RoleGate'
import SummaryCard from '../components/dashboard/SummaryCard'
import RoomStatusGrid from '../components/dashboard/RoomStatusGrid'
import BookingsChart from '../components/dashboard/BookingsChart'
import GhostBookingLog from '../components/dashboard/GhostBookingLog'

// Available hours per room per day (8am–8pm = 12 hours)
const AVAILABLE_HOURS_PER_ROOM = 12

export default function DashboardPage() {
  const { profile } = useAuth()

  return (
    <RoleGate
      roles="admin"
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-gray-500">You don't have access to the dashboard.</p>
          <p className="text-sm text-gray-400">Admin role required.</p>
        </div>
      }
    >
      <DashboardContent />
    </RoleGate>
  )
}

function DashboardContent() {
  const [rooms, setRooms] = useState([])
  const [todayBookings, setTodayBookings] = useState([])
  const [weekBookings, setWeekBookings] = useState([])
  const [ghostBookings, setGhostBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const sevenDaysAgo = subDays(now, 7).toISOString()

  const fetchAll = useCallback(async () => {
    const [roomsRes, todayRes, weekRes, ghostRes] = await Promise.all([
      supabase.from('rooms').select('*').order('name'),

      // Today's bookings (non-cancelled) with profile info
      supabase
        .from('bookings')
        .select('*, profiles(display_name)')
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .not('status', 'in', '("cancelled")'),

      // This week's bookings for chart
      supabase
        .from('bookings')
        .select('*, rooms(name)')
        .gte('start_time', weekStart)
        .lte('start_time', weekEnd)
        .not('status', 'in', '("cancelled","ghost_released")'),

      // Ghost bookings last 7 days
      supabase
        .from('bookings')
        .select('*, rooms(name), profiles(display_name)')
        .eq('status', 'ghost_released')
        .gte('start_time', sevenDaysAgo)
        .order('start_time', { ascending: false }),
    ])

    if (roomsRes.data) setRooms(roomsRes.data)
    if (todayRes.data) setTodayBookings(todayRes.data)
    if (weekRes.data) setWeekBookings(weekRes.data)
    if (ghostRes.data) setGhostBookings(ghostRes.data)
    setLoading(false)
  }, [todayStart, todayEnd, weekStart, weekEnd, sevenDaysAgo])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Realtime: bookings + rooms
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => fetchAll()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAll])

  // ── Computed summary values ──

  const totalRooms = rooms.length

  const activeNow = useMemo(() => {
    const n = new Date()
    return todayBookings.filter(
      (b) =>
        new Date(b.start_time) <= n &&
        new Date(b.end_time) > n &&
        (b.status === 'active' || b.status === 'scheduled')
    ).length
  }, [todayBookings])

  const ghostCountToday = useMemo(() => {
    return todayBookings.filter((b) => b.status === 'ghost_released').length
  }, [todayBookings])

  const utilisation = useMemo(() => {
    if (rooms.length === 0) return 0
    // Sum booked hours today
    let totalBookedMinutes = 0
    for (const b of todayBookings) {
      if (b.status === 'cancelled' || b.status === 'ghost_released') continue
      const start = new Date(b.start_time)
      const end = new Date(b.end_time)
      totalBookedMinutes += (end - start) / 60000
    }
    const totalBookedHours = totalBookedMinutes / 60
    const totalAvailable = rooms.length * AVAILABLE_HOURS_PER_ROOM
    return Math.round((totalBookedHours / totalAvailable) * 100)
  }, [rooms, todayBookings])

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Real-time overview of room usage
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="Total Rooms"
          value={totalRooms}
          detail="Across all buildings"
          loading={loading}
        />
        <SummaryCard
          label="Active Now"
          value={activeNow}
          detail={`${activeNow} of ${totalRooms} rooms`}
          loading={loading}
        />
        <SummaryCard
          label="Ghost Bookings Today"
          value={ghostCountToday}
          detail="Auto-released"
          loading={loading}
        />
        <SummaryCard
          label="Utilisation Today"
          value={`${utilisation}%`}
          detail="8am–8pm basis"
          loading={loading}
        />
      </div>

      {/* Two-column: room status + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 mb-8">
        {/* Room status grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Room Status</h2>
          <RoomStatusGrid
            rooms={rooms}
            bookings={todayBookings}
            loading={loading}
          />
        </div>

        {/* Bookings chart */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Bookings This Week</h2>
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <BookingsChart
              rooms={rooms}
              bookings={weekBookings}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Ghost booking log */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Ghost Bookings</h2>
          <p className="text-sm text-gray-500">Last 7 days</p>
        </div>
        <div className="border border-gray-200 rounded-lg bg-white">
          <GhostBookingLog
            ghostBookings={ghostBookings}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
