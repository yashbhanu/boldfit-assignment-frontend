import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, formatPrice } from '../api'
import { useCart } from '../cart'
import { Alert, EmptyState, ProductThumb, Spinner } from '../components/ui'

export function CartPage() {
  const cart = useCart()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = cart.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const itemCount = cart.lines.reduce((sum, l) => sum + l.quantity, 0)

  async function placeOrder() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const order = await api.createOrder(
        cart.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
        cart.checkoutKey,
      )
      cart.clear()
      navigate(`/orders/${order.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'OUT_OF_STOCK') {
        const details = e.details as { sku: string; available: number }[]
        const names = details.map((d) => {
          const name = cart.lines.find((l) => l.sku === d.sku)?.name ?? d.sku
          return d.available === 0 ? `${name} is sold out` : `only ${d.available} ${name} left`
        })
        setError(`Sorry, ${names.join(', ')}. Please update your cart.`)
      } else {
        setError((e as Error).message)
      }
      setSubmitting(false)
    }
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Your cart is empty"
        text="Looks like you haven't added anything yet."
        cta={{ to: '/', label: 'Start shopping' }}
      />
    )
  }

  return (
    <>
      <div className="page-title">
        <h1>Your cart</h1>
        <span className="pill">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="two-col">
        <section className="card">
          {cart.lines.map((l) => (
            <div key={l.sku} className="line-item">
              <ProductThumb sku={l.sku} />
              <div className="grow">
                <div className="name">{l.name}</div>
                <div className="meta">{formatPrice(l.price)} each</div>
                <button className="btn-link" disabled={submitting} onClick={() => cart.setQuantity(l.sku, 0)}>
                  Remove
                </button>
              </div>
              <div className="stepper">
                <button disabled={submitting} onClick={() => cart.setQuantity(l.sku, l.quantity - 1)} aria-label="Decrease">−</button>
                <span>{l.quantity}</span>
                <button disabled={submitting || l.quantity >= 10} onClick={() => cart.setQuantity(l.sku, l.quantity + 1)} aria-label="Increase">+</button>
              </div>
              <div className="amount">{formatPrice(l.price * l.quantity)}</div>
            </div>
          ))}
        </section>

        <aside className="card card-body sticky">
          <div className="card-title">Order summary</div>
          <div className="summary-row">
            <span className="muted">Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="summary-row">
            <span className="muted">Shipping</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Free</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          {error && (
            <div style={{ marginTop: 16 }}>
              <Alert tone="danger" icon="⚠️" title="Couldn't place order">{error}</Alert>
            </div>
          )}

          <button className="btn btn-dark btn-block btn-lg" style={{ marginTop: 16 }} disabled={submitting} onClick={placeOrder}>
            {submitting ? <><Spinner /> Placing order…</> : 'Place order'}
          </button>
          <p className="fine-print">
            Items are reserved for 15 minutes once you place the order. Final prices are confirmed at checkout.
          </p>
          <div className="secure-note">🔒 Secure checkout</div>
        </aside>
      </div>
    </>
  )
}
