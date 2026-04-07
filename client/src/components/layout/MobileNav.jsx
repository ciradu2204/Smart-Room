import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function MobileNav({ links, isOpen, onClose }) {
  const { user, profile, logout } = useAuth()

  if (!isOpen) return null

  function handleLogout() {
    onClose()
    logout()
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 left-0 w-72 bg-white flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-6 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">SmartRoom</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `block text-base py-3 px-6 border-b border-gray-100 transition-colors duration-150 ${
                  isActive
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + sign out */}
        {user && (
          <div className="border-t border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.display_name || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {user.email}
            </p>
            <button
              onClick={handleLogout}
              className="mt-3 w-full text-left text-sm text-gray-700 hover:bg-gray-50 py-2 px-3 rounded-md transition-colors duration-150"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
