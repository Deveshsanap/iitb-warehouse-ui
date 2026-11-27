import { useEffect, useState } from 'react'
import { ApiError, fetchDashboard, type DashboardData } from '../api'

const MAX_STORAGE = 24 // 25 grid locations minus transfer point A1

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchDashboard()
      .then((d) => {
        if (!cancelled) setData(d)
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
      <h1>Auditor dashboard</h1>
      {loading && <p>Loading dashboard…</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="value">{data.occupied}</div>
              <div>Occupied storage locations</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.free}</div>
              <div>Free storage locations</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.pallets.length}</div>
              <div>Pallets in stock</div>
            </div>
          </div>

          <section className="chart" aria-label="Occupancy over the past 7 days">
            <h2>Occupancy — past 7 days</h2>
            <p className="muted">
              Each day shows occupied (red) and free (green) storage locations
              out of {MAX_STORAGE}. Daily values are the end-of-day counts
              recorded by the API from reproducible seeded history; today&apos;s
              bar uses the live counts above.
            </p>
            <div className="chart-bars">
              {data.history.map((day) => (
                <div className="chart-col" key={day.date}>
                  <span>{day.occupied}</span>
                  <div
                    className="chart-bar"
                    style={{ height: `${(day.occupied / MAX_STORAGE) * 100}%` }}
                    title={`${day.date}: ${day.occupied} occupied`}
                  />
                  <div
                    className="chart-bar free"
                    style={{ height: `${(day.free / MAX_STORAGE) * 100}%` }}
                    title={`${day.date}: ${day.free} free`}
                  />
                  <span>{day.free}</span>
                  <span className="chart-label">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>

          <h2>Currently stocked pallets</h2>
          {data.pallets.length === 0 ? (
            <p>No pallets are currently in stock.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pallet number</th>
                    <th>Barcode</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pallets.map((p) => (
                    <tr key={p.pallet_number}>
                      <td>{p.pallet_number}</td>
                      <td>{p.barcode}</td>
                      <td>{p.item}</td>
                      <td>{p.quantity}</td>
                      <td>{p.location ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  )
}
