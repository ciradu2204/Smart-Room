import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import MobileNav from './MobileNav'
import NotificationBell from './NotificationBell'

const userLinks = [
  { to: '/rooms', label: 'Rooms' },
  { to: '/bookings', label: 'My Bookings' },
  { to: '/schedule', label: 'Schedule' },
]

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/admin/rooms', label: 'Manage Rooms' },
  { to: '/admin/users', label: 'Users' },
]

const roleBadge = {
  admin: 'bg-amber-50 text-amber-700',
  faculty: 'bg-sky-50 text-sky-700',
  student: 'bg-gray-100 text-gray-600',
}

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const links = isAdmin ? [...userLinks, ...adminLinks] : userLinks

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [dropdownOpen])

  const displayName = profile?.display_name || 'User'
  const role = profile?.role || 'student'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-6">
          {/* Left: Logo */}
          <Link
            to="/rooms"
            className="text-lg font-semibold text-gray-900 shrink-0"
          >
            SmartRoom
          </Link>

          {/* Center: Desktop nav links */}
          {user && (
            <nav className="hidden md:flex items-center gap-8">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `text-sm font-medium pb-[17px] pt-[19px] border-b-2 transition-colors duration-150 ${
                      isActive
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Right: User section */}
          {user && (
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <NotificationBell />

              {/* User dropdown (desktop) */}
              <div className="hidden md:block relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:bg-gray-50 rounded-md px-2 py-1.5 transition-colors duration-150"
                >
                  <span className="text-sm text-gray-700">{displayName}</span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${roleBadge[role] || roleBadge.student}`}
                  >
                    {role}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <div className="px-3 py-2">
                      <p className="text-xs text-gray-400 truncate">
                        Signed in as {user.email}
                      </p>
                    </div>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        logout()
                      }}
                      className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 py-2 px-3 transition-colors duration-150"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile: avatar circle (always visible) */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="md:hidden w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600"
              >
                {initial}
              </button>

              {/* Mobile: hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden text-gray-500 hover:text-gray-700 transition-colors duration-150"
                aria-label="Open menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile slide-in nav */}
      <MobileNav
        links={links}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  )
}
