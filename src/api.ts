// Types mirror the backend response DTOs. Money is in paise.

export interface Product {
  sku: string
  name: string
  description: string
  price: number
  stock: number
  currency: string
}

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'NEEDS_REVIEW'

export interface Order {
  id: string
  status: OrderStatus
  items: { sku: string; name: string; unitPrice: number; quantity: number }[]
  totalAmount: number
  currency: string
  reviewReason: string | null
  expiresAt: string
  createdAt: string
  payment: {
    id: string
    status: 'CREATED' | 'FAILED' | 'CAPTURED'
    provider: string
    amountPaid: number | null
    failureReason: string | null
  } | null
}

export interface PaymentIntent {
  paymentId: string
  status: string
  provider: string
  providerOrderId: string
  amount: number
  currency: string
  razorpayKeyId: string
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(status: number, body: { message?: string | string[]; code?: string; details?: unknown }) {
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message
    super(message ?? `Request failed (${status})`)
    this.status = status
    this.code = body.code
    this.details = body.details
  }
}

// Hardcoded demo token, the backend maps it to a customer id
const TOKEN = import.meta.env.VITE_API_TOKEN ?? 'dev-token-guest'
// Backend origin when deployed separately. Empty in dev (Vite proxies /api).
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(0, { message: 'Network error, is the backend running?' })
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body)
  return body as T
}

export const api = {
  listProducts: () => request<{ data: Product[] }>('/api/products').then((r) => r.data),

  createOrder: (items: { sku: string; quantity: number }[], idempotencyKey: string) =>
    request<Order>('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ items }),
    }),

  listOrders: () => request<{ data: Order[] }>('/api/orders').then((r) => r.data),

  getOrder: (id: string) => request<Order>(`/api/orders/${id}`),

  createPayment: (orderId: string) =>
    request<PaymentIntent>(`/api/orders/${orderId}/payments`, { method: 'POST' }),

  verifyRazorpayPayment: (orderId: string, body: Record<string, string>) =>
    request(`/api/orders/${orderId}/payments/verify`, { method: 'POST', body: JSON.stringify(body) }),
}

export function formatPrice(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
}
