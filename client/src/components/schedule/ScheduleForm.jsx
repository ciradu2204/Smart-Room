import { useState } from 'react'
import { Button } from '../ui'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const FEATURES = ['Projector', 'Whiteboard', 'Power outlets']

function generateTimeOptions() {
  const options = []
  for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 20 && m > 30) break
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      options.push({ value: `${hh}:${mm}`, label: `${h12}:${mm} ${period}` })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

function emptySlot() {
  return {
    id: crypto.randomUUID(),
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    title: '',
    preferredCapacity: 1,
    requiredFeatures: [],
  }
}

function FeatureDropdown({ selected, onChange }) {
  const [open, setOpen] = useState(false)

  function toggle(feature) {
    const next = selected.includes(feature)
      ? selected.filter((f) => f !== feature)
      : [...selected, feature]
    onChange(next)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input text-sm !py-1.5 !px-2 text-left truncate !w-full"
      >
        {selected.length === 0
          ? 'Features...'
          : selected.length === 1
            ? selected[0]
            : `${selected.length} selected`}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-sm py-1">
            {FEATURES.map((f) => (
              <label
                key={f}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(f)}
                  onChange={() => toggle(f)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                {f}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ScheduleForm({ slots, onChange, onSave, saving }) {
  const [errors, setErrors] = useState({})

  function updateSlot(id, field, value) {
    onChange(slots.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
    // Clear error for this slot on change
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  function removeSlot(id) {
    onChange(slots.filter((s) => s.id !== id))
  }

  function addSlot() {
    onChange([...slots, emptySlot()])
  }

  function validate() {
    const newErrors = {}

    for (const slot of slots) {
      if (!slot.title?.trim()) {
        newErrors[slot.id] = 'Title / reason is required'
      } else if (slot.endTime <= slot.startTime) {
        newErrors[slot.id] = 'End time must be after start time'
      }
    }

    // Check for duplicate day+time
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i]
        const b = slots[j]
        if (
          a.dayOfWeek === b.dayOfWeek &&
          a.startTime < b.endTime &&
          a.endTime > b.startTime
        ) {
          newErrors[b.id] = `Overlaps with another ${b.dayOfWeek} slot`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSave() {
    if (validate()) {
      onSave(slots)
    }
  }

  return (
    <div>
      {/* Slot list */}
      <div className="flex flex-col gap-3">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="border border-gray-200 rounded-lg p-3 bg-white"
          >
            <div className="grid grid-cols-[1fr_1fr_1fr_80px_1fr_32px] gap-2 items-start">
              {/* Day */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Day</label>
                <select
                  className="input text-sm !py-1.5"
                  value={slot.dayOfWeek}
                  onChange={(e) => updateSlot(slot.id, 'dayOfWeek', e.target.value)}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Start */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Start</label>
                <select
                  className="input text-sm !py-1.5"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(slot.id, 'startTime', e.target.value)}
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* End */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">End</label>
                <select
                  className="input text-sm !py-1.5"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(slot.id, 'endTime', e.target.value)}
                >
                  {TIME_OPTIONS.filter((opt) => opt.value > slot.startTime).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Capacity */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Cap.</label>
                <input
                  type="number"
                  min={1}
                  className="input text-sm !py-1.5 !px-2"
                  value={slot.preferredCapacity}
                  onChange={(e) =>
                    updateSlot(slot.id, 'preferredCapacity', Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>

              {/* Features */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Features</label>
                <FeatureDropdown
                  selected={slot.requiredFeatures}
                  onChange={(features) => updateSlot(slot.id, 'requiredFeatures', features)}
                />
              </div>

              {/* Remove */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-transparent">X</label>
                <button
                  type="button"
                  onClick={() => removeSlot(slot.id)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  aria-label="Remove slot"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.47 4.47a.75.75 0 011.06 0L8 6.94l2.47-2.47a.75.75 0 111.06 1.06L9.06 8l2.47 2.47a.75.75 0 11-1.06 1.06L8 9.06l-2.47 2.47a.75.75 0 01-1.06-1.06L6.94 8 4.47 5.53a.75.75 0 010-1.06z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Title / reason */}
            <div className="mt-2">
              <input
                type="text"
                className="input text-sm !py-1.5"
                placeholder="Title / reason (e.g., Operating Systems lecture)"
                value={slot.title}
                onChange={(e) => updateSlot(slot.id, 'title', e.target.value)}
              />
            </div>

            {/* Inline error */}
            {errors[slot.id] && (
              <p className="text-xs text-rose-600 mt-1.5">{errors[slot.id]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: stack layout note — the grid above collapses fine with overflow-x */}
      {slots.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          No time slots added yet. Add your first one below.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={addSlot}
          className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add time slot
        </button>

        {slots.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save schedule'}
          </Button>
        )}
      </div>
    </div>
  )
}
