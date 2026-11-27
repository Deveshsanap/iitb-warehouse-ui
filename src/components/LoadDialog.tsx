import { useState, type FormEvent } from 'react'
import { ApiError, loadPallet, type WarehouseLocation } from '../api'

interface Props {
  freeLocations: WarehouseLocation[]
  onClose: () => void
  onSuccess: (message: string) => void
}

export default function LoadDialog({ freeLocations, onClose, onSuccess }: Props) {
  const [palletNumber, setPalletNumber] = useState('')
  const [barcode, setBarcode] = useState('')
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [destination, setDestination] = useState(freeLocations[0]?.code ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Quantity must be a whole number of 1 or more.')
      return
    }
    if (!destination) {
      setError('Choose a destination storage location.')
      return
    }
    setBusy(true)
    try {
      await loadPallet({
        pallet_number: palletNumber.trim(),
        barcode: barcode.trim(),
        item: item.trim(),
        quantity: qty,
        destination,
      })
      onSuccess(
        `Pallet ${palletNumber.trim()} loaded into ${destination}.`,
      )
      onClose()
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
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="load-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="load-title">Load a pallet</h2>
        <p className="muted">
          The pallet is palletised at transfer point A1 and the shuttle moves
          it to the destination.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="pallet-number">Pallet number</label>
            <input
              id="pallet-number"
              value={palletNumber}
              onChange={(e) => setPalletNumber(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="barcode">Barcode</label>
            <input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="item">Item / product name</label>
            <input
              id="item"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="destination">Destination storage location</label>
            <select
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            >
              {freeLocations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.code}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'Loading…' : 'Load pallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
