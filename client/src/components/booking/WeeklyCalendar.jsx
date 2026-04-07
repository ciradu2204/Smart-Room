import { useEffect, useMemo, useRef, useState } from 'react'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  addDays,
  format,
  isSameDay,
  isToday,
} from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import BookingBlock from './BookingBlock'
import TimeSlot from './TimeSlot'
import Skeleton from '../ui/Skeleton'

const START_HOUR = 7
const END_HOUR = 21 // 9 PM
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 60 // px
const TIME_LABEL_WIDTH = 52 // px

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)
const DAYS = Array.from({ length: 7 }, (_, i) => i) // 0 = Monday

function formatHourLabel(hour) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12} ${period}`
}

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 7 }).map((_, col) => (
        <div key={col} className="flex flex-col gap-1">
          <Skeleton width="100%" height="2rem" className="mb-2" />
          {Array.from({ length: 3 }).map((_, row) => {
            const heights = [80, 60, 120, 40, 90, 60, 100]
            return (
              <Skeleton
                key={row}
                width="100%"
                height={`${heights[(col + row) % heights.length]}px`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function WeeklyCalendar({
  bookings,
  loading,
  roomId,
  roomName,
  onOpenBookingModal,
}) {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedMobileDay, setSelectedMobileDay] = useState(0)
  const nowLineRef = useRef(null)
  const [now, setNow] = useState(() => new Date())

  // Update now every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  )
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart])

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  const days = useMemo(
    () => DAYS.map((i) => addDays(weekStart, i)),
    [weekStart]
  )

  // Filter bookings to this week
  const weekBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const s = new Date(b.start_time)
        return s >= weekStart && s <= weekEnd
      }),
    [bookings, weekStart, weekEnd]
  )

  function getBookingsForDay(day) {
    return weekBookings.filter((b) => isSameDay(new Date(b.start_time), day))
  }

  // Now-line position
  const nowMinutes = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT
  const showNowLine = nowMinutes >= 0 && nowMinutes <= TOTAL_HOURS * 60

  // Scroll to now-line on mount
  useEffect(() => {
    if (nowLineRef.current) {
      nowLineRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [loading])

  function goToToday() {
    setWeekOffset(0)
    const todayIndex = days.findIndex((d) => isToday(d))
    if (todayIndex >= 0) setSelectedMobileDay(todayIndex)
  }

  function handleSlotClick({ day, hour }) {
    onOpenBookingModal(day, hour)
  }

  if (loading) return <CalendarSkeleton />

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="btn-secondary text-sm px-3 py-1.5"
        >
          &larr; Previous
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900">{weekLabel}</span>
          {weekOffset !== 0 && (
            <button
              onClick={goToToday}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors duration-150"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="btn-secondary text-sm px-3 py-1.5"
        >
          Next &rarr;
        </button>
      </div>

      {/* Mobile day tabs */}
      <div className="flex md:hidden overflow-x-auto gap-1 mb-3 -mx-1 px-1">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => setSelectedMobileDay(i)}
            className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
              selectedMobileDay === i
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-xs font-medium">{format(day, 'EEE')}</span>
            <span className="font-semibold">{format(day, 'd')}</span>
            {isToday(day) && (
              <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Desktop: all 7 days. Mobile: single selected day */}

        {/* Column headers */}
        <div
          className="hidden md:grid border-b border-gray-200 bg-gray-50"
          style={{
            gridTemplateColumns: `${TIME_LABEL_WIDTH}px repeat(7, 1fr)`,
          }}
        >
          {/* Empty corner for time labels */}
          <div />
          {days.map((day, i) => (
            <div
              key={i}
              className={`py-2.5 px-2 text-center border-l border-gray-200 ${
                isToday(day) ? 'bg-white' : ''
              }`}
            >
              <p className="text-xs text-gray-500">{format(day, 'EEE')}</p>
              <p
                className={`text-sm ${
                  isToday(day)
                    ? 'font-semibold text-gray-900'
                    : 'font-medium text-gray-700'
                }`}
              >
                {format(day, 'd')}
              </p>
              {isToday(day) && (
                <div className="mx-auto mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-600" />
              )}
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          <div
            className="relative"
            style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
          >
            {/* Hour rows */}
            {HOURS.map((hour, i) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-gray-100"
                style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                {/* Time label */}
                <span
                  className="absolute text-xs text-gray-400 text-right pr-2 -top-2"
                  style={{ width: `${TIME_LABEL_WIDTH}px` }}
                >
                  {formatHourLabel(hour)}
                </span>
              </div>
            ))}

            {/* Desktop: 7 day columns */}
            <div
              className="hidden md:grid absolute inset-0"
              style={{
                gridTemplateColumns: `${TIME_LABEL_WIDTH}px repeat(7, 1fr)`,
              }}
            >
              {/* Spacer for time labels */}
              <div />

              {days.map((day, dayIdx) => {
                const dayBookings = getBookingsForDay(day)
                return (
                  <div
                    key={dayIdx}
                    className="relative border-l border-gray-200"
                  >
                    {/* Clickable empty slots */}
                    {HOURS.map((hour, hi) => (
                      <TimeSlot
                        key={hour}
                        index={hi}
                        actualHour={hour}
                        day={day}
                        onSelect={handleSlotClick}
                      />
                    ))}

                    {/* Booking blocks */}
                    {dayBookings.map((b) => (
                      <BookingBlock
                        key={b.id}
                        booking={b}
                        isMine={b.user_id === user?.id}
                        startHour={START_HOUR}
                      />
                    ))}

                    {/* Now line — today's column only */}
                    {isToday(day) && showNowLine && (
                      <div
                        ref={nowLineRef}
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: `${nowTop}px` }}
                      >
                        <div className="relative">
                          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div className="border-t-2 border-emerald-500 w-full" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Mobile: single day column */}
            <div
              className="md:hidden absolute inset-0"
              style={{
                paddingLeft: `${TIME_LABEL_WIDTH}px`,
              }}
            >
              <div className="relative h-full">
                {/* Clickable empty slots */}
                {HOURS.map((hour, hi) => (
                  <TimeSlot
                    key={hour}
                    hour={hi}
                    day={days[selectedMobileDay]}
                    onSelect={handleSlotClick}
                  />
                ))}

                {/* Booking blocks */}
                {getBookingsForDay(days[selectedMobileDay]).map((b) => (
                  <BookingBlock
                    key={b.id}
                    booking={b}
                    isMine={b.user_id === user?.id}
                    startHour={START_HOUR}
                  />
                ))}

                {/* Now line */}
                {isToday(days[selectedMobileDay]) && showNowLine && (
                  <div
                    ref={weekOffset === 0 ? nowLineRef : undefined}
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${nowTop}px` }}
                  >
                    <div className="relative">
                      <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div className="border-t-2 border-emerald-500 w-full" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
