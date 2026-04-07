import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfWeek, addDays, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { API_URL } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui'
import Skeleton from '../components/ui/Skeleton'
import ScheduleForm from '../components/schedule/ScheduleForm'
import AllocationResults from '../components/schedule/AllocationResults'

const DAY_OFFSETS = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
}

export default function SchedulePage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scheduleSaved, setScheduleSaved] = useState(false)

  // Allocation state
  const [allocating, setAllocating] = useState(false)
  const [allocations, setAllocations] = useState(null)
  const [overrides, setOverrides] = useState([])
  const [confirming, setConfirming] = useState(false)

  // Load existing schedule
  const loadSchedule = useCallback(async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week')

    if (!error && data && data.length > 0) {
      setSlots(
        data.map((row) => ({
          id: row.id,
          dayOfWeek: row.day_of_week,
          startTime: row.start_time,
          endTime: row.end_time,
          title: row.title || '',
          preferredCapacity: row.preferred_capacity || 1,
          requiredFeatures: row.required_features || [],
        }))
      )
      setScheduleSaved(true)
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  // Save schedule to Supabase (delete existing + insert new)
  async function handleSave(updatedSlots) {
    setSaving(true)

    // Delete existing
    await supabase.from('schedules').delete().eq('user_id', user.id)

    if (updatedSlots.length > 0) {
      const rows = updatedSlots.map((s) => ({
        user_id: user.id,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        title: s.title?.trim() || null,
        preferred_capacity: s.preferredCapacity,
        required_features: s.requiredFeatures,
      }))

      const { error } = await supabase.from('schedules').insert(rows)
      if (error) {
        toast.error('Failed to save schedule.')
        setSaving(false)
        return
      }
    }

    toast.success('Schedule saved')
    setScheduleSaved(true)
    // Clear previous allocation results since schedule changed
    setAllocations(null)
    setOverrides([])
    setSaving(false)

    // Reload to get server-generated IDs
    loadSchedule()
  }

  // Run auto-allocation via Express backend
  async function handleAllocate() {
    setAllocating(true)
    setAllocations(null)
    setOverrides([])

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

    try {
      const res = await fetch(`${API_URL}/api/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          slots: slots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            title: s.title,
            preferredCapacity: s.preferredCapacity,
            requiredFeatures: s.requiredFeatures,
          })),
          weekStartDate: weekStart.toISOString(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Allocation failed')
      }

      const data = await res.json()
      setAllocations(data.allocations)
      setOverrides(data.overrides || [])
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setAllocating(false)
    }
  }

  // Confirm via server (service role handles override cancellations + inserts)
  async function handleConfirm() {
    if (!allocations) return

    const successful = allocations.filter((a) => a.allocated)
    if (successful.length === 0) return

    setConfirming(true)

    try {
      const res = await fetch(`${API_URL}/api/allocate/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, allocations }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to confirm bookings.')
      }

      const { booked } = await res.json()
      toast.success(`${booked} room${booked > 1 ? 's' : ''} booked successfully`)
      navigate('/bookings')
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  // Week label for the allocate button
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto">
        <Skeleton width="130px" height="1.75rem" className="mb-2" />
        <Skeleton width="320px" height="0.875rem" className="mb-6" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              <div className="flex gap-2">
                <Skeleton width="20%" height="2rem" />
                <Skeleton width="20%" height="2rem" />
                <Skeleton width="20%" height="2rem" />
                <Skeleton width="15%" height="2rem" />
                <Skeleton width="20%" height="2rem" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[720px] mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-gray-900">My Schedule</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Define your weekly room needs. We'll automatically find available rooms for you.
      </p>

      {/* Step 1: Schedule form */}
      <ScheduleForm
        slots={slots}
        onChange={(updated) => {
          setSlots(updated)
          setScheduleSaved(false)
          setAllocations(null)
        }}
        onSave={handleSave}
        saving={saving}
      />

      {/* Step 2: Auto-allocate */}
      {scheduleSaved && slots.length > 0 && (
        <div className="mt-8">
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Auto-allocate rooms
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Find rooms for the week of {weekLabel}
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleAllocate}
                disabled={allocating}
                className={allocating ? 'animate-pulse' : ''}
              >
                {allocating ? 'Allocating...' : 'Find rooms for this week'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Allocation results */}
      {allocations && (
        <div className="mt-6">
          <AllocationResults
            allocations={allocations}
            overrides={overrides}
            onConfirm={handleConfirm}
            confirming={confirming}
          />
        </div>
      )}
    </div>
  )
}
