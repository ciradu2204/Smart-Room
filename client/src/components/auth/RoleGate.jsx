import { useAuth } from '../../context/AuthContext'

export default function RoleGate({ roles, fallback = null, children }) {
  const { profile } = useAuth()

  if (!profile) return fallback

  const allowed = Array.isArray(roles) ? roles : [roles]

  if (!allowed.includes(profile.role)) return fallback

  return children
}
