import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Skeleton from '../ui/Skeleton'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  console.log('[ProtectedRoute] loading:', loading, 'user:', !!user)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton width="160px" height="20px" />
        <p className="text-xs text-gray-400 mt-2">Loading auth...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
