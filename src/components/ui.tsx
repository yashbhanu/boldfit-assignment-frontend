import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { productVisual } from '../productVisuals'

export function ProductThumb({ sku, small = false }: { sku: string; small?: boolean }) {
  const v = productVisual(sku)
  return (
    <div className={`thumb ${small ? 'thumb-sm' : ''}`} style={{ background: v.tint }} aria-hidden>
      {v.emoji}
    </div>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden />
}

export function EmptyState(props: { icon: string; title: string; text: string; cta?: { to: string; label: string } }) {
  return (
    <div className="card empty">
      <div className="empty-icon">{props.icon}</div>
      <h2>{props.title}</h2>
      <p>{props.text}</p>
      {props.cta && (
        <Link to={props.cta.to} className="btn btn-dark">
          {props.cta.label}
        </Link>
      )}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card empty">
      <div className="empty-icon" style={{ background: 'var(--danger-bg)' }}>⚠️</div>
      <h2>Something went wrong</h2>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-dark" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Alert({ tone, icon, title, children }: {
  tone: 'success' | 'danger' | 'warning' | 'info'
  icon: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="alert-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  )
}
