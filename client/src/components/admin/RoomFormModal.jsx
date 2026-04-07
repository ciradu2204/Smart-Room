import { useEffect, useState } from 'react'
import { Button, Input } from '../ui'

const AMENITY_OPTIONS = ['Projector', 'Whiteboard', 'Power outlets']

export default function RoomFormModal({ isOpen, onClose, onSave, room }) {
  const isEdit = !!room
  const [name, setName] = useState('')
  const [floor, setFloor] = useState('')
  const [capacity, setCapacity] = useState(1)
  const [amenities, setAmenities] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (room) {
        setName(room.name || '')
        setFloor(room.floor || '')
        setCapacity(room.capacity || 1)
        setAmenities(room.amenities || [])
      } else {
        setName('')
        setFloor('')
        setCapacity(1)
        setAmenities([])
      }
      setError('')
    }
  }, [isOpen, room])

  function toggleAmenity(a) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Room name is required.')
      return
    }

    setSubmitting(true)
    try {
      await onSave({
        name: name.trim(),
        floor: floor.trim() || null,
        capacity: Math.max(1, capacity),
        amenities,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md mx-4 p-6"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {isEdit ? 'Edit Room' : 'Add Room'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Room Name"
            placeholder="e.g., Room 101"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            required
          />

          <Input
            label="Floor"
            placeholder="e.g., 1"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Capacity</label>
            <input
              type="number"
              min={1}
              className="input"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <label
                  key={a}
                  className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border cursor-pointer transition-colors duration-150 ${
                    amenities.includes(a)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={amenities.includes(a)}
                    onChange={() => toggleAmenity(a)}
                    className="sr-only"
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
