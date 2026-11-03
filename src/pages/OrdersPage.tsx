import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPrice, type Order } from '../api'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState, ProductThumb } from '../components/ui'

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .listOrders()
      .then((data) => {
        setOrders(data)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(load, [load])

  if (error) return <ErrorState message={error} onRetry={() => {
          setError(null)
          load()
        }} />

  return (
    <>
      <div className="page-title">
        <h1>My orders</h1>
      </div>

      {!orders ? (
        <div className="card" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="order-row">
              <div className="skeleton" style={{ width: 44, height: 44 }} />
              <div className="grow">
                <div className="skeleton" style={{ height: 16, width: '40%' }} />
                <div className="skeleton" style={{ height: 12, width: '25%', marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon="📦" title="No orders yet" text="When you place an order, it will show up here." cta={{ to: '/', label: 'Start shopping' }} />
      ) : (
        <div className="card">
          {orders.map((o) => {
            const count = o.items.reduce((sum, i) => sum + i.quantity, 0)
            return (
              <Link key={o.id} to={`/orders/${o.id}`} className="order-row">
                <div className="thumb-stack">
                  {o.items.slice(0, 3).map((i) => (
                    <ProductThumb key={i.sku} sku={i.sku} small />
                  ))}
                </div>
                <div className="grow">
                  <div className="id">#{o.id}</div>
                  <div className="meta">
                    {new Date(o.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {count} {count === 1 ? 'item' : 'items'}
                  </div>
                </div>
                <StatusBadge status={o.status} />
                <strong>{formatPrice(o.totalAmount)}</strong>
                <span className="chevron">›</span>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
