import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, formatPrice, type Order } from '../api'
import { PaymentPanel } from '../components/PaymentPanel'
import { StatusBadge } from '../components/StatusBadge'
import { Alert, EmptyState, ErrorState, ProductThumb } from '../components/ui'

const POLL_MS = 2000

export function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    api.getOrder(id!).then(
      (o) => {
        setOrder(o)
        setError(null)
      },
      (e: ApiError) => setError(e),
    )
  }, [id])

  useEffect(load, [load])

  // Payment is confirmed by a webhook, so poll while the order is still pending
  const pending = order?.status === 'PENDING_PAYMENT'
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
  }, [pending, load])

  if (error && !order) {
    return error.status === 404 ? (
      <EmptyState icon="🔍" title="Order not found" text="We couldn't find this order on your account." cta={{ to: '/orders', label: 'View my orders' }} />
    ) : (
      <ErrorState message={error.message} onRetry={load} />
    )
  }
  if (!order) return <OrderSkeleton />

  return (
    <>
      <p style={{ margin: '0 0 16px' }}>
        <Link to="/orders" className="btn-link" style={{ textDecoration: 'none' }}>← All orders</Link>
      </p>

      <section className="card card-body" style={{ marginBottom: 24 }}>
        <div className="order-head">
          <div>
            <h1>Order #{order.id}</h1>
            <div className="meta">
              Placed on {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {pending && <Countdown until={order.expiresAt} />}
            <StatusBadge status={order.status} />
          </div>
        </div>
        <Tracker order={order} />
      </section>

      <StatusAlert order={order} />
      {error && <p className="error-text">Couldn't refresh the latest status: {error.message}</p>}

      <div className="two-col">
        <div>
          <section className="card">
            <div className="card-body" style={{ paddingBottom: 0 }}>
              <div className="card-title">Items</div>
            </div>
            {order.items.map((i) => (
              <div key={i.sku} className="line-item">
                <ProductThumb sku={i.sku} />
                <div className="grow">
                  <div className="name">{i.name}</div>
                  <div className="meta">Qty {i.quantity} · {formatPrice(i.unitPrice)} each</div>
                </div>
                <div className="amount">{formatPrice(i.unitPrice * i.quantity)}</div>
              </div>
            ))}
          </section>

          {pending && <PaymentPanel order={order} onPaymentUpdate={load} />}
        </div>

        <aside className="card card-body sticky">
          <div className="card-title">Summary</div>
          <div className="summary-row">
            <span className="muted">Subtotal</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="summary-row">
            <span className="muted">Shipping</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Free</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
          {order.payment?.amountPaid != null && (
            <div className="summary-row" style={{ marginTop: 10 }}>
              <span className="muted">Amount paid</span>
              <span>{formatPrice(order.payment.amountPaid)}</span>
            </div>
          )}
          {order.payment && (
            <div className="summary-row">
              <span className="muted">Payment</span>
              <span>Razorpay · {order.payment.status.toLowerCase()}</span>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const secondsLeft = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000))
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  return <span className="countdown" title="Time left to complete payment">⏱ {mm}:{ss}</span>
}

type StepState = 'done' | 'current' | 'failed' | ''

function Tracker({ order }: { order: Order }) {
  const steps: { label: string; state: StepState }[] = (() => {
    switch (order.status) {
      case 'PENDING_PAYMENT':
        return [
          { label: 'Order placed', state: 'done' },
          { label: order.payment?.status === 'FAILED' ? 'Payment failed' : 'Payment', state: order.payment?.status === 'FAILED' ? 'failed' : 'current' },
          { label: 'Confirmed', state: '' },
        ]
      case 'PAID':
        return [
          { label: 'Order placed', state: 'done' },
          { label: 'Payment', state: 'done' },
          { label: 'Confirmed', state: 'done' },
        ]
      case 'EXPIRED':
        return [
          { label: 'Order placed', state: 'done' },
          { label: 'Expired', state: 'failed' },
          { label: 'Confirmed', state: '' },
        ]
      case 'NEEDS_REVIEW':
        return [
          { label: 'Order placed', state: 'done' },
          { label: 'Payment', state: 'done' },
          { label: 'Under review', state: 'failed' },
        ]
    }
  })()

  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div key={s.label} className={`step ${s.state}`}>
          <div className="step-dot">{s.state === 'done' ? '✓' : s.state === 'failed' ? '!' : i + 1}</div>
          {s.label}
        </div>
      ))}
    </div>
  )
}

function StatusAlert({ order }: { order: Order }) {
  switch (order.status) {
    case 'PENDING_PAYMENT':
      return (
        <Alert tone="info" icon="🕒" title="Complete your payment">
          Your items are reserved until {new Date(order.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
          After that they're released back to stock.
        </Alert>
      )
    case 'PAID':
      return (
        <Alert tone="success" icon="🎉" title="Order confirmed">
          Payment received, thank you! We'll send you an update when your order ships.
        </Alert>
      )
    case 'EXPIRED':
      return (
        <Alert tone="danger" icon="⌛" title="This order expired">
          Payment wasn't completed in time, so the items were released. <Link to="/">Place a new order</Link>.
        </Alert>
      )
    case 'NEEDS_REVIEW':
      return (
        <Alert tone="warning" icon="🔎" title="We're checking your payment">
          We received a payment
          {order.payment?.amountPaid != null && ` of ${formatPrice(order.payment.amountPaid)}`} but something doesn't
          match. Our team will confirm your order or refund you within 24 hours.
          {order.reviewReason && <div className="mono" style={{ marginTop: 6, opacity: 0.8 }}>{order.reviewReason}</div>}
        </Alert>
      )
  }
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading order">
      <div className="card card-body" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 24, width: '40%' }} />
        <div className="skeleton" style={{ height: 14, width: '25%', marginTop: 10 }} />
        <div className="skeleton" style={{ height: 50, marginTop: 24 }} />
      </div>
      <div className="two-col">
        <div className="card card-body">
          <div className="skeleton" style={{ height: 64 }} />
          <div className="skeleton" style={{ height: 64, marginTop: 12 }} />
        </div>
        <div className="card card-body">
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      </div>
    </div>
  )
}
