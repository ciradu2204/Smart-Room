import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button, Input } from '../components/ui'
import Skeleton from '../components/ui/Skeleton'
import BookingCard from '../components/booking/BookingCard'
import CancelDialog from '../components/booking/CancelDialog'
import EditBookingModal from '../components/booking/EditBookingModal'

const TABS = ['Upcoming', 'History']

export default function MyBookingsPage() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Upcoming')

  // Admin filters
  const [roomFilter, setRoomFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [rooms, setRooms] = useState([])

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null)

  // Edit modal state
  const [editTarget, setEditTarget] = useState(null)

  const fetchBookings = useCallback(async () => {
    let query

    if (isAdmin) {
      query = supabase
        .from('bookings')
        .select('*, rooms(name, floor), profiles(display_name, role)')
        .order('start_time', { ascending: true })
    } else {
      query = supabase
        .from('bookings')
        .select('*, rooms(name, floor)')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true })
    }

    const { data, error } = await query
    if (!error && data) setBookings(data)
    setLoading(false)
  }, [user?.id, isAdmin])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Fetch rooms for admin filter dropdown
  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('rooms')
      .select('id, name')
      .order('name')
      .then(({ data }) => { if (data) setRooms(data) })
  }, [isAdmin])

  // Realtime subscription
  useEffect(() => {
    const filter = isAdmin ? undefined : `user_id=eq.${user.id}`
    const channel = supabase
      .channel('my-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          ...(filter && { filter }),
        },
        () => fetchBookings()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, isAdmin, fetchBookings])

  // Split into upcoming / history
  const now = new Date()

  const { upcoming, history } = useMemo(() => {
    let filtered = bookings

    // Admin filters
    if (isAdmin) {
      if (roomFilter) {
        filtered = filtered.filter((b) => b.room_id === roomFilter)
      }
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase()
        filtered = filtered.filter(
          (b) => b.profiles?.display_name?.toLowerCase().includes(q)
        )
      }
      if (statusFilter) {
        filtered = filtered.filter((b) => b.status === statusFilter)
      }
    }

    // Upcoming: not yet ended AND status is scheduled or active
    const upcoming = filtered.filter(
      (b) =>
        new Date(b.end_time) > now &&
        ['scheduled', 'active'].includes(b.status)
    )
    // History: either ended or already completed/cancelled/ghost_released
    const history = filtered.filter(
      (b) =>
        new Date(b.end_time) <= now ||
        ['completed', 'cancelled', 'ghost_released'].includes(b.status)
    )
    const upcomingIds = new Set(upcoming.map((b) => b.id))
    const dedupedHistory = history.filter((b) => !upcomingIds.has(b.id))

    return { upcoming, history: dedupedHistory }
  }, [bookings, isAdmin, roomFilter, userSearch, statusFilter, now])

  const visibleBookings = activeTab === 'Upcoming' ? upcoming : history

  async function handleCancel() {
    if (!cancelTarget) return
    const { data, error, count } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', cancelTarget.id)
      .select()

    console.log('[Cancel]', { data, error, count, id: cancelTarget.id })

    if (error) {
      toast.error('Failed to cancel booking.')
    } else if (!data || data.length === 0) {
      toast.error('Could not cancel — you may not have permission.')
    } else {
      toast.success('Booking cancelled')
    }
    setCancelTarget(null)
    fetchBookings()
  }

  async function handleEditSave(updatedFields) {
    if (!editTarget) return
    const { error } = await supabase
      .from('bookings')
      .update(updatedFields)
      .eq('id', editTarget.id)

    if (error) {
      throw error
    }
    toast.success('Booking updated')
    setEditTarget(null)
    fetchBookings()
  }

  if (loading) {
    return (
      <div>
        <Skeleton width="140px" height="1.75rem" className="mb-2" />
        <div className="flex gap-4 mb-6 mt-4">
          <Skeleton width="80px" height="2rem" />
          <Skeleton width="60px" height="2rem" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <Skeleton width="40%" height="1.125rem" />
                <Skeleton width="70px" height="1.25rem" className="!rounded-full" />
              </div>
              <Skeleton width="60%" height="0.875rem" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Title */}
      <h1 className="text-2xl font-semibold text-gray-900">
        {isAdmin ? 'All Bookings' : 'My Bookings'}
      </h1>

      {/* Tabs */}
      <div className="flex gap-6 mt-4 mb-4 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'Upcoming' && upcoming.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">
                ({upcoming.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Admin filters */}
      {isAdmin && (
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            className="input text-sm !w-auto !py-1.5"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
          >
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <input
            type="text"
            className="input text-sm !w-48 !py-1.5"
            placeholder="Search by user..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />

          <select
            className="input text-sm !w-auto !py-1.5"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="ghost_released">Ghost Released</option>
          </select>
        </div>
      )}

      {/* Booking list */}
      {visibleBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          {activeTab === 'Upcoming' ? (
            <>
              <p className="text-gray-500">No upcoming bookings</p>
              <Link to="/rooms" className="mt-3">
                <Button variant="primary" size="sm">Browse rooms</Button>
              </Link>
            </>
          ) : (
            <p className="text-gray-400">No booking history yet</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleBookings.map((booking) => {
            const isOwn = booking.user_id === user.id
            const canManage = activeTab === 'Upcoming' && isOwn
            return (
              <BookingCard
                key={booking.id}
                booking={booking}
                isPast={activeTab === 'History'}
                isAdmin={isAdmin}
                onEdit={canManage ? (b) => setEditTarget(b) : undefined}
                onCancel={canManage ? (b) => setCancelTarget(b) : undefined}
              />
            )
          })}
        </div>
      )}

      {/* Cancel dialog */}
      <CancelDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />

      {/* Edit modal */}
      {editTarget && (
        <EditBookingModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          booking={editTarget}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
}
