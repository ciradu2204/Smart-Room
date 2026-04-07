import { useState } from 'react'
import { Button } from '../ui'

export default function CancelDialog({ isOpen, onClose, onConfirm }) {
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
        aria-label="Cancel booking"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Cancel this booking?
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep booking
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Cancelling...' : 'Cancel booking'}
          </Button>
        </div>
      </div>
    </div>
  )
}
