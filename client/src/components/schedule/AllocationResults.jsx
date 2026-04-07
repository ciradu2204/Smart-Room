import { Button } from '../ui'

function formatTimeLabel(time24) {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm3.22 4.72a.75.75 0 00-1.06.02L7.4 8.88 5.84 7.22a.75.75 0 10-1.08 1.04l2.1 2.2a.75.75 0 001.08-.02l3.3-3.66a.75.75 0 00-.02-1.06z" />
    </svg>
  )
}

function FailIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 110 14A7 7 0 018 1zM6.53 5.47a.75.75 0 00-1.06 1.06L6.94 8 5.47 9.47a.75.75 0 101.06 1.06L8 9.06l1.47 1.47a.75.75 0 101.06-1.06L9.06 8l1.47-1.47a.75.75 0 00-1.06-1.06L8 6.94 6.53 5.47z" />
    </svg>
  )
}

export default function AllocationResults({
  allocations,
  overrides,
  onConfirm,
  confirming,
}) {
  const successCount = allocations.filter((a) => a.allocated).length

  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Allocation Results
      </h3>

      <div className="flex flex-col gap-2.5">
        {allocations.map((a, i) => {
          const slot = a.slot
          const timeRange = `${formatTimeLabel(slot.startTime)}–${formatTimeLabel(slot.endTime)}`

          return (
            <div key={i} className="flex items-start gap-2.5">
              {a.allocated ? <CheckIcon /> : <FailIcon />}
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  {slot.dayOfWeek} {timeRange}
                </span>
                {a.allocated ? (
                  <span className="text-gray-600">
                    {' → '}{a.room.name}
                    <span className="text-gray-400">
                      {' '}(Capacity {a.room.capacity}
                      {a.room.amenities?.length > 0 && `, ${a.room.amenities.join(', ')}`})
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-400">
                    {' → '}No available room
                    {a.reason && (
                      <span className="text-xs ml-1">({a.reason})</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Override notices */}
      {overrides.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {overrides.map((o, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2"
            >
              <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 110 14A7 7 0 018 1zM7.25 5v3.5a.75.75 0 001.5 0V5a.75.75 0 00-1.5 0zm.75 6.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
              </svg>
              <p className="text-xs text-amber-700">
                Note: This overrides {o.displacedUserName}'s booking in {o.roomName}.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Confirm button */}
      <div className="mt-5 flex justify-end">
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={successCount === 0 || confirming}
        >
          {confirming
            ? 'Booking...'
            : `Confirm and book ${successCount === 1 ? '1 room' : `all ${successCount} rooms`}`}
        </Button>
      </div>
    </div>
  )
}
