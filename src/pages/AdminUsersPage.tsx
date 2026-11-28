import { useEffect, useState, type FormEvent } from 'react'
import {
  ApiError,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUser,
  type Role,
} from '../api'
import { useAuth } from '../auth'

const ROLES: Role[] = ['admin', 'auditor', 'technician']

function describeError(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : 'Could not reach the server. Check that the API is running.'
}

/** One row of the users table: role change, password reset, delete.
 * The role select is controlled by the `user.role` prop, so a failed
 * PATCH (e.g. "Cannot demote the last admin.") snaps the select back
 * to the real role with no extra code. */
function UserRow({
  user,
  isSelf,
  onMutated,
  onFailed,
}: {
  user: AdminUser
  isSelf: boolean
  onMutated: (message: string) => Promise<void>
  onFailed: (message: string) => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleRoleChange(next: Role) {
    if (next === user.role || user.id === undefined) return
    setBusy(true)
    try {
      await updateAdminUser(user.id, { role: next })
      await onMutated(`Role for ${user.username} changed to ${next}.`)
    } catch (err) {
      onFailed(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleResetPassword() {
    if (user.id === undefined) return
    if (!newPassword) {
      onFailed('Enter a new password first.')
      return
    }
    setBusy(true)
    try {
      await updateAdminUser(user.id, { password: newPassword })
      setNewPassword('')
      await onMutated(`Password reset for ${user.username}.`)
    } catch (err) {
      onFailed(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (user.id === undefined) return
    if (
      !window.confirm(
        `Delete user ${user.username}? This cannot be undone.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteAdminUser(user.id)
      await onMutated(`User ${user.username} deleted.`)
    } catch (err) {
      onFailed(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr>
      <td>{user.username}</td>
      <td>
        <label className="sr-only" htmlFor={`role-${user.id}`}>
          Role for {user.username}
        </label>
        <select
          id={`role-${user.id}`}
          value={user.role}
          disabled={busy}
          onChange={(e) => handleRoleChange(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="row-actions">
          <label className="sr-only" htmlFor={`new-password-${user.id}`}>
            New password for {user.username}
          </label>
          <input
            id={`new-password-${user.id}`}
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            disabled={busy}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleResetPassword}
          >
            Reset password
          </button>
          <button
            type="button"
            className="danger"
            disabled={busy || isSelf}
            title={
              isSelf ? 'You cannot delete your own account.' : undefined
            }
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
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
      setError(describeError(err))
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

  async function handleMutated(message: string) {
    setError(null)
    setNotice(message)
    await refresh()
  }

  function handleFailed(message: string) {
    setNotice(null)
    setError(message)
  }

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
      setError(describeError(err))
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id ?? u.username}
                  user={u}
                  isSelf={u.username === currentUser?.username}
                  onMutated={handleMutated}
                  onFailed={handleFailed}
                />
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
          The API guards the last admin: you cannot delete your own account,
          delete the last admin, or demote the last admin to another role.
        </p>
      </section>
    </main>
  )
}
