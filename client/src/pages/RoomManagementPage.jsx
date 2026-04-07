import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui'
import Skeleton from '../components/ui/Skeleton'
import RoleGate from '../components/auth/RoleGate'
import RoomFormModal from '../components/admin/RoomFormModal'
import DeleteRoomDialog from '../components/admin/DeleteRoomDialog'

export default function RoomManagementPage() {
  return (
    <RoleGate
      roles="admin"
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-gray-500">You don't have access to this page.</p>
          <p className="text-sm text-gray-400">Admin role required.</p>
        </div>
      }
    >
      <RoomManagementContent />
    </RoleGate>
  )
}

function RoomManagementContent() {
  const toast = useToast()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name')

    if (!error && data) setRooms(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  function openAdd() {
    setEditingRoom(null)
    setFormOpen(true)
  }

  function openEdit(room) {
    setEditingRoom(room)
    setFormOpen(true)
  }

  async function handleSave(fields) {
    if (editingRoom) {
      const { error } = await supabase
        .from('rooms')
        .update(fields)
        .eq('id', editingRoom.id)

      if (error) throw error
      toast.success('Room updated')
    } else {
      const { error } = await supabase
        .from('rooms')
        .insert(fields)

      if (error) throw error
      toast.success('Room added')
    }
    fetchRooms()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      toast.error('Failed to delete room.')
    } else {
      toast.success('Room deleted')
      fetchRooms()
    }
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manage Rooms</h1>
          <p className="text-sm text-gray-500 mt-1">Add, edit, or remove rooms.</p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          + Add Room
        </Button>
      </div>

      {loading ? (
        <div className="border border-gray-200 rounded-lg bg-white">
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
                <Skeleton width="25%" height="1rem" />
                <Skeleton width="20%" height="0.875rem" />
                <Skeleton width="10%" height="0.875rem" />
                <Skeleton width="15%" height="0.875rem" />
              </div>
            ))}
          </div>
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-gray-200 rounded-lg bg-white">
          <p className="text-gray-500">No rooms yet.</p>
          <Button variant="primary" size="sm" className="mt-3" onClick={openAdd}>
            Add your first room
          </Button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">Name</th>
                <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">Floor</th>
                <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">Capacity</th>
                <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">Amenities</th>
                <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                  <td className="table-cell font-medium text-gray-900">{room.name}</td>
                  <td className="table-cell text-gray-600">{room.floor || '—'}</td>
                  <td className="table-cell text-gray-600">{room.capacity}</td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(room.amenities || []).map((a) => (
                        <span key={a} className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                          {a}
                        </span>
                      ))}
                      {(!room.amenities || room.amenities.length === 0) && (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(room)}>
                        Edit
                      </Button>
                      <button
                        onClick={() => setDeleteTarget(room)}
                        className="btn-secondary text-sm px-3 py-1.5 !text-rose-600 !border-rose-200 hover:!bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RoomFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingRoom(null) }}
        onSave={handleSave}
        room={editingRoom}
      />

      <DeleteRoomDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        roomName={deleteTarget?.name || ''}
      />
    </div>
  )
}
