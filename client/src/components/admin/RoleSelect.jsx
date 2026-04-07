import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { Button } from '../ui'

const ROLES = ['student', 'faculty', 'admin']

export default function RoleSelect({ userId, userName, currentRole, onUpdate }) {
  const toast = useToast()
  const [confirmPromote, setConfirmPromote] = useState(false)
  const [pendingRole, setPendingRole] = useState(null)
  const [updating, setUpdating] = useState(false)

  async function applyRole(newRole) {
    setUpdating(true)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    setUpdating(false)

    if (error) {
      toast.error('Failed to update role.')
      return
    }

    toast.success('Role updated')
    onUpdate(userId, newRole)
  }

  function handleChange(e) {
    const newRole = e.target.value
    if (newRole === currentRole) return

    if (newRole === 'admin') {
      setPendingRole(newRole)
      setConfirmPromote(true)
    } else {
      applyRole(newRole)
    }
  }

  function handleConfirm() {
    setConfirmPromote(false)
    if (pendingRole) {
      applyRole(pendingRole)
      setPendingRole(null)
    }
  }

  function handleCancel() {
    setConfirmPromote(false)
    setPendingRole(null)
  }

  return (
    <>
      <select
        value={currentRole}
        onChange={handleChange}
        disabled={updating}
        className="border-0 bg-transparent text-sm text-gray-700 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded py-0.5 -ml-1"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
      </select>

      {/* Admin promotion confirmation dialog */}
      {confirmPromote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}
        >
          <div
            className="bg-white rounded-lg w-full max-w-sm mx-4 p-6"
            role="alertdialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Promote {userName} to Admin?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Admins have full system access including user management, room
              configuration, and booking overrides.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirm}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
