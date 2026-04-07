import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { API_URL } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import RoleGate from '../components/auth/RoleGate'
import UserTable from '../components/admin/UserTable'
import AddUserModal from '../components/admin/AddUserModal'
import { Button } from '../components/ui'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

export default function UsersPage() {
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
      <UsersContent />
    </RoleGate>
  )
}

function UsersContent() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const debounceRef = useRef(null)

  const fetchUsers = useCallback(async (searchTerm, pageNum) => {
    setLoading(true)

    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (searchTerm.trim()) {
      // Search by name or email with OR
      query = query.or(
        `display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      console.error('Failed to fetch users:', error.message)
      setLoading(false)
      return
    }

    setUsers(data || [])
    setTotalCount(count || 0)
    setLoading(false)

    // Fetch booking counts in the background (non-blocking)
    if (data && data.length > 0) {
      const userIds = data.map((u) => u.id)
      try {
        const { data: counts } = await supabase
          .from('bookings')
          .select('user_id')
          .in('user_id', userIds)

        if (counts) {
          const countMap = new Map()
          counts.forEach((b) => {
            countMap.set(b.user_id, (countMap.get(b.user_id) || 0) + 1)
          })
          setUsers((prev) =>
            prev.map((u) => ({ ...u, booking_count: countMap.get(u.id) || 0 }))
          )
        }
      } catch {
        // Booking counts are non-critical — ignore errors
      }
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchUsers('', 0)
  }, [fetchUsers])

  // Debounced search
  function handleSearchChange(e) {
    const value = e.target.value
    setSearch(value)
    setPage(0)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchUsers(value, 0)
    }, DEBOUNCE_MS)
  }

  function handlePrev() {
    const newPage = Math.max(0, page - 1)
    setPage(newPage)
    fetchUsers(search, newPage)
  }

  function handleNext() {
    const maxPage = Math.ceil(totalCount / PAGE_SIZE) - 1
    const newPage = Math.min(maxPage, page + 1)
    setPage(newPage)
    fetchUsers(search, newPage)
  }

  function handleRoleUpdate(userId, newRole) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
  }

  async function handleAddUser({ display_name, email, password, role }) {
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name, email, password, role }),
    })

    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Failed to create user.')

    toast.success(`${display_name} added as ${role}`)
    fetchUsers(search, page)
  }

  const from = page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, totalCount)
  const hasPrev = page > 0
  const hasNext = to < totalCount

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user accounts and roles.</p>
        </div>
        <Button variant="primary" onClick={() => setAddModalOpen(true)}>
          + Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by name or email..."
          className="input !pl-10"
        />
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <UserTable
          users={users}
          loading={loading}
          onRoleUpdate={handleRoleUpdate}
        />
      </div>

      {/* Pagination */}
      {totalCount > 0 && !loading && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {from}–{to} of {totalCount} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrev}
              disabled={!hasPrev}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNext}
              disabled={!hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      <AddUserModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddUser}
      />
    </div>
  )
}
