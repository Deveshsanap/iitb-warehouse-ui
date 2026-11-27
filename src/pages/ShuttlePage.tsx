import { useEffect, useState } from 'react'
import { ApiError, fetchShuttle, type Shuttle } from '../api'

export default function ShuttlePage() {
  const [shuttle, setShuttle] = useState<Shuttle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchShuttle()
      .then((data) => {
        if (!cancelled) setShuttle(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not reach the server. Check that the API is running.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="page">
      <h1>Shuttle status</h1>
      {loading && <p>Loading shuttle status…</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {shuttle && (
        <div className="kv">
          <dl>
            <dt>Identifier</dt>
            <dd>{shuttle.identifier}</dd>
            <dt>Status</dt>
            <dd>{shuttle.status}</dd>
            <dt>Battery</dt>
            <dd>{shuttle.battery_percent}%</dd>
          </dl>
        </div>
      )}
      <p className="muted">
        The shuttle transfers pallets between transfer point A1 and storage
        locations. Status and battery are stored in the database; this page is
        read-only.
      </p>
    </main>
  )
}
