import { formatDistanceToNow } from 'date-fns'
import Skeleton from '../ui/Skeleton'
import RoleSelect from './RoleSelect'

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          <td className="table-cell"><Skeleton width="60%" height="0.875rem" /></td>
          <td className="table-cell"><Skeleton width="70%" height="0.875rem" /></td>
          <td className="table-cell"><Skeleton width="50px" height="0.875rem" /></td>
          <td className="table-cell"><Skeleton width="30px" height="0.875rem" /></td>
          <td className="table-cell"><Skeleton width="80px" height="0.875rem" /></td>
        </tr>
      ))}
    </tbody>
  )
}

export default function UserTable({ users, loading, onRoleUpdate }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-200">
            <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">
              Name
            </th>
            <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">
              Email
            </th>
            <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">
              Role
            </th>
            <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">
              Bookings
            </th>
            <th className="table-cell text-xs uppercase tracking-wider text-gray-500 font-medium">
              Joined
            </th>
          </tr>
        </thead>

        {loading ? (
          <TableSkeleton />
        ) : users.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                No users match your search
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="table-cell font-medium text-gray-900">
                  {user.display_name || '—'}
                </td>
                <td className="table-cell text-gray-500">
                  {user.email || '—'}
                </td>
                <td className="table-cell">
                  <RoleSelect
                    userId={user.id}
                    userName={user.display_name || 'this user'}
                    currentRole={user.role || 'student'}
                    onUpdate={onRoleUpdate}
                  />
                </td>
                <td className="table-cell text-gray-600">
                  {user.booking_count ?? 0}
                </td>
                <td className="table-cell text-gray-500 text-sm">
                  {user.created_at
                    ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  )
}
