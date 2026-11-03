import type { OrderStatus } from '../api'

const STYLES: Record<OrderStatus, { label: string; tone: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'pill-warning' },
  PAID: { label: 'Confirmed', tone: 'pill-success' },
  EXPIRED: { label: 'Expired', tone: '' },
  NEEDS_REVIEW: { label: 'Under review', tone: 'pill-danger' },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = STYLES[status]
  return <span className={`pill ${tone}`}>{label}</span>
}
