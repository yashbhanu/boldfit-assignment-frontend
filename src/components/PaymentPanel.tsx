import { useState } from 'react'
import { api, formatPrice, type Order, type PaymentIntent } from '../api'
import { Alert, Spinner } from './ui'

interface Props {
  order: Order
  onPaymentUpdate: () => void
}

type Step = 'idle' | 'opening' | 'checkout' | 'confirming'

/**
 * Pays a pending order with Razorpay Checkout.
 * The order page keeps polling the webhook
 */
export function PaymentPanel({ order, onPaymentUpdate }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setStep('opening')
    setError(null)
    try {
      // Safe to call repeatedly: the backend returns the same intent for this order
      const intent = await api.createPayment(order.id)
      setStep('checkout')
      await openRazorpayCheckout(intent, order.id, {
        onConfirming: () => setStep('confirming'),
        onUpdate: onPaymentUpdate,
      })
    } catch (e) {
      setError((e as Error).message)
    }
    setStep('idle')
  }

  const label = {
    idle: `Pay ${formatPrice(order.totalAmount)}`,
    opening: 'Opening Razorpay…',
    checkout: 'Complete payment in the Razorpay window…',
    confirming: 'Confirming your payment…',
  }[step]

  return (
    <section className="card card-body" style={{ marginTop: 24 }}>
      <div className="card-title">Payment</div>

      {order.payment?.status === 'FAILED' && (
        <Alert tone="danger" icon="✕" title="Payment failed">
          {order.payment.failureReason ?? 'Your last payment attempt did not go through'}. No money was taken, so you can
          try again.
        </Alert>
      )}

      <button className="btn btn-primary btn-block btn-lg" disabled={step !== 'idle'} onClick={pay}>
        {step !== 'idle' && <Spinner />}
        {label}
      </button>
      <div className="secure-note">🔒 Secured by Razorpay · UPI, cards, netbanking &amp; wallets</div>

      {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
    </section>
  )
}

// ---- Razorpay Checkout.js ----

interface RazorpayCheckout {
  open: () => void
  on: (event: 'payment.failed', cb: () => void) => void
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout. Check your connection and try again.'))
    document.body.appendChild(script)
  })
}

/** Opens Checkout and resolves once the customer pays or closes the window. */
async function openRazorpayCheckout(
  intent: PaymentIntent,
  orderId: string,
  callbacks: { onConfirming: () => void; onUpdate: () => void },
): Promise<void> {
  await loadRazorpayScript()

  return new Promise((resolve) => {
    const checkout = new window.Razorpay!({
      key: intent.razorpayKeyId,
      order_id: intent.providerOrderId,
      amount: intent.amount,
      currency: intent.currency,
      name: 'Boldfit',
      description: `Order #${orderId}`,
      theme: { color: '#0f0f0f' },
      // Success callback from the browser. The backend verifies the signature and re-fetches the payment from Razorpay before trusting it.
      handler: async (response: Record<string, string>) => {
        callbacks.onConfirming()
        await api.verifyRazorpayPayment(orderId, response).catch(() => undefined)
        callbacks.onUpdate()
        resolve()
      },
      modal: {
        ondismiss: () => {
          callbacks.onUpdate()
          resolve()
        },
      },
    })
    // Razorpay keeps the window open so the customer can retry; just refresh our status
    checkout.on('payment.failed', callbacks.onUpdate)
    checkout.open()
  })
}
