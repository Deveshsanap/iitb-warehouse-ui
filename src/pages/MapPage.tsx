import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchMap, unloadPallet, type WarehouseLocation } from '../api'
import { useAuth } from '../auth'
import LoadDialog from '../components/LoadDialog'

const POLL_MS = 3000 // brief requires changes from another session within 5s

function cellLabel(loc: WarehouseLocation): string {
  if (loc.is_transfer_point) return 'Transfer Point'
  if (loc.occupied && loc.pallet) return loc.pallet.pallet_number
  if (loc.occupied) return 'Occupied'
  return 'Free'
}

export default function MapPage() {
  const { hasRole } = useAuth()
  const canOperate = hasRole('technician', 'admin')
  const [locations, setLocations] = useState<WarehouseLocation[]>([])
  const [selected, setSelected] = useState<WarehouseLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [showLoad, setShowLoad] = useState(false)
  const [unloading, setUnloading] = useState(false)

  const refresh = useCallback(async (silent: boolean) => {
    try {
      const data = await fetchMap()
      setLocations(data.locations)
      setError(null)
      // Keep the detail panel in sync with the latest poll.
      setSelected((prev) => {
        if (!prev) return prev
        return data.locations.find((l) => l.code === prev.code) ?? prev
      })
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not reach the server. Check that the API is running.',
        )
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh(false).finally(() => {
      if (!cancelled) setLoading(false)
    })
    const timer = window.setInterval(() => refresh(true), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [refresh])

  const freeLocations = locations.filter(
    (l) => !l.is_transfer_point && !l.occupied,
  )

  async function handleUnload(loc: WarehouseLocation) {
    setUnloading(true)
    setNotice(null)
    try {
      await unloadPallet(loc.code)
      setNotice({
        kind: 'success',
        text: `Pallet ${loc.pallet?.pallet_number ?? ''} unloaded from ${loc.code} and removed from stock.`,
      })
      setSelected(null)
      await refresh(false)
    } catch (err) {
      setNotice({
        kind: 'error',
        text:
          err instanceof ApiError
            ? err.message
            : 'Could not reach the server. Check that the API is running.',
      })
    } finally {
      setUnloading(false)
    }
  }

  // Rows 1..5, columns A..E — the API returns codes A1..E5; sort defensively.
  const sorted = [...locations].sort((a, b) => a.code.localeCompare(b.code))
  const grid: WarehouseLocation[][] = []
  for (let row = 1; row <= 5; row++) {
    grid.push(
      sorted.filter((l) => l.code.endsWith(String(row))),
    )
  }

  return (
    <main className="page">
      <h1>Warehouse map</h1>
      <ul className="legend" aria-label="Legend">
        <li>
          <span className="swatch" style={{ background: '#16a34a' }} />
          Free storage
        </li>
        <li>
          <span className="swatch" style={{ background: '#dc2626' }} />
          Occupied storage
        </li>
        <li>
          <span className="swatch" style={{ background: '#d97706' }} />
          A1 — Transfer Point
        </li>
      </ul>

      {notice && (
        <p className={`notice ${notice.kind}`} role="status">
          {notice.text}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      <div className="map-layout">
        <div>
          {loading ? (
            <p>Loading warehouse map…</p>
          ) : (
            <div className="grid" role="grid" aria-label="Warehouse floor, 5 by 5">
              {grid.flat().map((loc) => (
                <button
                  key={loc.code}
                  type="button"
                  role="gridcell"
                  className={[
                    'cell',
                    loc.is_transfer_point
                      ? 'transfer'
                      : loc.occupied
                        ? 'occupied'
                        : 'free',
                    selected?.code === loc.code ? 'selected' : '',
                  ].join(' ')}
                  onClick={() => setSelected(loc)}
                  aria-label={`${loc.code}: ${cellLabel(loc)}`}
                >
                  <span className="code">
                    {loc.is_transfer_point ? 'A1 — Transfer Point' : loc.code}
                  </span>
                  <span className="state">{cellLabel(loc)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="map-actions">
            {canOperate && (
              <button
                className="primary"
                type="button"
                onClick={() => setShowLoad(true)}
                disabled={freeLocations.length === 0}
              >
                Load a pallet
              </button>
            )}
            <span className="muted">
              Map refreshes every 3 seconds. {freeLocations.length} of 24
              storage locations free.
            </span>
          </div>
        </div>

        <aside className="detail-panel" aria-live="polite">
          {selected ? (
            <>
              <h2>Location {selected.code}</h2>
              {selected.is_transfer_point ? (
                <p>
                  A1 is the transfer point where pallets enter and leave the
                  warehouse. It does not hold stock.
                </p>
              ) : selected.occupied && selected.pallet ? (
                <>
                  <dl>
                    <dt>Pallet number</dt>
                    <dd>{selected.pallet.pallet_number}</dd>
                    <dt>Barcode</dt>
                    <dd>{selected.pallet.barcode}</dd>
                    <dt>Item</dt>
                    <dd>{selected.pallet.item}</dd>
                    <dt>Quantity</dt>
                    <dd>{selected.pallet.quantity}</dd>
                  </dl>
                  {canOperate && (
                    <button
                      type="button"
                      onClick={() => handleUnload(selected)}
                      disabled={unloading}
                    >
                      {unloading ? 'Unloading…' : 'Unload pallet'}
                    </button>
                  )}
                </>
              ) : (
                <p>This storage location is free.</p>
              )}
            </>
          ) : (
            <p>Select a location to see its details.</p>
          )}
        </aside>
      </div>

      {showLoad && (
        <LoadDialog
          freeLocations={freeLocations}
          onClose={() => setShowLoad(false)}
          onSuccess={(message) => {
            setNotice({ kind: 'success', text: message })
            refresh(false)
          }}
        />
      )}
    </main>
  )
}
