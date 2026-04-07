import { useState } from 'react'
import { Button } from '../ui'

export default function DeleteRoomDialog({ isOpen, onClose, onConfirm, roomName }) {
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  async function handleConfirm() {
    setSubmitting(true)
    await onConfirm()
    setSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-lg w-full max-w-sm mx-4 p-6"
        role="alertdialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Delete {roomName}?
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          This will permanently remove the room and all its future bookings. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete room'}
          </Button>
        </div>
      </div>
    </div>
  )
}
