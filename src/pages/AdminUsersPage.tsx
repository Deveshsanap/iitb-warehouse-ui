import { useEffect, useState, type FormEvent } from 'react'
import {
  ApiError,
  createAdminUser,
  fetchAdminUsers,
  type AdminUser,
  type Role,
} from '../api'

// Day 1 skeleton: list users + create form. Edit / delete arrive Day 2.
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('technician')
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setUsers(await fetchAdminUsers())
      setError(null)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check that the API is running.',
      )
    }
  }

  useEffect(() => {
    let cancelled = false
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      await createAdminUser({
        username: username.trim(),
        password,
        role,
      })
      setNotice(`User ${username.trim()} (${role}) created.`)
      setUsername('')
      setPassword('')
      setRole('technician')
      await refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check that the API is running.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>Admin — Users</h1>
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading users…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id ?? u.username}>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="form-card">
        <h2>Create a user</h2>
        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="new-username">Username</label>
            <input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">Password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-role">Role</label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="technician">Technician</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create user'}
          </button>
        </form>
        <p className="muted">
          Editing roles, resetting passwords and removing users arrive on Day
          2.
        </p>
      </section>
    </main>
  )
}
