import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'
import type { Role } from './api'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import ShuttlePage from './pages/ShuttlePage'
import DashboardPage from './pages/DashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireRole({
  roles,
  children,
}: {
  roles: Role[]
  children: ReactNode
}) {
  const { user, hasRole } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!hasRole(...roles)) {
    return (
      <main className="page">
        <h1>Access denied</h1>
        <p>
          Your role ({user.role}) does not have access to this page. Ask an
          administrator if you need access.
        </p>
        <p>
          <Link to="/">Back to the warehouse map</Link>
        </p>
      </main>
    )
  }
  return <>{children}</>
}

function Nav() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        Warehouse Management
      </Link>
      <nav className="nav" aria-label="Main navigation">
        <Link to="/">Map</Link>
        <Link to="/shuttle">Shuttle</Link>
        {hasRole('auditor', 'admin') && <Link to="/dashboard">Dashboard</Link>}
        {hasRole('admin') && <Link to="/admin">Admin Users</Link>}
      </nav>
      <div className="userbox">
        <span>
          {user.username} ({user.role})
        </span>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="app">
      <Nav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <MapPage />
            </RequireAuth>
          }
        />
        <Route
          path="/shuttle"
          element={
            <RequireAuth>
              <ShuttlePage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireRole roles={['auditor', 'admin']}>
              <DashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin']}>
              <AdminUsersPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
