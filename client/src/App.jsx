import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import RoomDetailPage from './pages/RoomDetailPage'
import MyBookingsPage from './pages/MyBookingsPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SchedulePage from './pages/SchedulePage'
import UsersPage from './pages/UsersPage'
import RoomManagementPage from './pages/RoomManagementPage'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Authenticated routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/rooms" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
                <Route path="/bookings" element={<MyBookingsPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/rooms" element={<RoomManagementPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
