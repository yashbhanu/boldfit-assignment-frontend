import { useCallback, useEffect, useState } from 'react'
import { api, formatPrice, type Product } from '../api'
import { useCart } from '../cart'
import { EmptyState, ErrorState } from '../components/ui'
import { productVisual } from '../productVisuals'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .listProducts()
      .then((data) => {
        setProducts(data)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(load, [load])

  return (
    <>
      <div className="section-heading">
        <h2>Shop all</h2>
        {products && <span className="pill">{products.length} products</span>}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => {
          setError(null)
          load()
        }} />
      ) : !products ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <EmptyState icon="📦" title="No products yet" text="Check back soon, new gear is on the way." />
      ) : (
        <div className="product-grid">
          {/* sold-out items last */}
          {[...products].sort((a, b) => Number(a.stock === 0) - Number(b.stock === 0)).map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
      )}
    </>
  )
}

function ProductCard({ product: p }: { product: Product }) {
  const cart = useCart()
  const inCart = cart.lines.find((l) => l.sku === p.sku)?.quantity ?? 0
  const soldOut = p.stock === 0
  const visual = productVisual(p.sku)

  return (
    <article className="card product-card">
      <div className={`product-media ${soldOut ? 'sold-out' : ''}`} style={{ background: visual.tint }}>
        <StockPill stock={p.stock} />
        <span aria-hidden>{visual.emoji}</span>
      </div>
      <div className="product-info">
        <h3>{p.name}</h3>
        <p className="desc">{p.description}</p>
        <div className="product-footer">
          <span className="price">{formatPrice(p.price)}</span>
          {inCart > 0 ? (
            <div className="stepper" aria-label={`${p.name} quantity`}>
              <button onClick={() => cart.setQuantity(p.sku, inCart - 1)} aria-label="Decrease">−</button>
              <span>{inCart}</span>
              <button onClick={() => cart.add(p)} disabled={inCart >= Math.min(p.stock, 10)} aria-label="Increase">+</button>
            </div>
          ) : (
            <button className="btn btn-primary" disabled={soldOut} onClick={() => cart.add(p)}>
              {soldOut ? 'Sold out' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function StockPill({ stock }: { stock: number }) {
  if (stock === 0) return <span className="pill pill-danger">Sold out</span>
  if (stock <= 5) return <span className="pill pill-warning">Only {stock} left</span>
  return <span className="pill pill-success">In stock</span>
}

function ProductGridSkeleton() {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="card product-card">
          <div className="skeleton" style={{ aspectRatio: '4 / 3', borderRadius: 0 }} />
          <div className="product-info">
            <div className="skeleton" style={{ height: 18, width: '70%' }} />
            <div className="skeleton" style={{ height: 14, width: '90%', margin: '10px 0 18px' }} />
            <div className="skeleton" style={{ height: 36 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
