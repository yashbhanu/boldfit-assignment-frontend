# Boldfit Checkout – Frontend

React + TypeScript + Vite. Customer-facing shop for the Boldfit checkout assignment.

Pages: **Shop** → **Cart** → **Order** (pay with Razorpay, live status) → **My orders**. The API lives in the separate backend repo.

## Run locally

Start the backend first (http://localhost:3000), then:

```bash
npm install
npm run dev   # http://localhost:5173
```

`.env` (optional locally):

| Variable | Value |
|---|---|
| `VITE_API_URL` | Backend URL. Leave empty locally (Vite proxies `/api` to `localhost:3000`) |
| `VITE_API_TOKEN` | Demo login token: `dev-token-guest` (default) or `dev-token-yash` |

## How it works

- **Cart:** kept in `localStorage`. It also holds an `Idempotency-Key` that only changes when the cart changes, so a double-click or a retry can't create two orders.
- **Place order:** the button is disabled while the request runs. Out-of-stock errors show which item is short.
- **Pay:** gets a Razorpay order from the backend and opens Razorpay Checkout. After payment the backend verifies it.
- **Order page:**
  - polls every 2s while payment is pending, until the webhook confirms the order;
  - shows a progress tracker and a countdown for the 15-minute reservation;
  - shows a clear message for paid, failed, expired or under-review orders.
- **Every page** has loading, empty and error states.

## Code layout

```
src/
  api.ts                 API client + types
  cart.tsx               cart state (localStorage)
  pages/                 ProductsPage, CartPage, OrderPage, OrdersPage
  components/            PaymentPanel (Razorpay), StatusBadge, shared UI
  index.css              styles
```

## Design decisions

### Three tradeoffs

**1. Idempotency key: a client-generated header, scoped per customer.**
The cart creates a UUID and sends it as `Idempotency-Key` when placing the order. The server stores it on the order (unique per customer) together with a hash of the cart. A retry or double-click returns the same order. Reusing the key with a different cart returns 422 instead of the wrong order.
*Rejected:* deduping on cart contents, because a customer may genuinely buy the same thing twice.

**2. Stock is reserved when the order is placed, with a 15-minute expiry.**
The customer never pays for something we can't ship. Abandoned orders release their stock when they expire.
*Rejected:* taking stock on payment success, which can oversell and turns a stock problem into a refund problem.

**3. The webhook is the source of truth; the order page polls.**
An order only becomes PAID from a signed Razorpay event, or from the Checkout callback after the backend re-checks the payment with Razorpay. The order page polls every 2s while payment is pending.
*Rejected:* trusting the browser's "success" (it can be faked or never arrive), and WebSockets (extra moving parts for a few seconds of waiting).

### One failure mode handled: webhook replay / duplicates

In the backend, `src/payments/payments.service.ts` → `handleWebhook()`:
1. Verify the HMAC signature on the raw body (401 if wrong).
2. In one MongoDB transaction: if the event id is already stored, return `duplicate`. Otherwise apply the change and store the event id.

The state change and the event id are saved together, so a crash can't leave one without the other. A second `captured` for the same payment is also a no-op even with a new event id, which covers the webhook and the Checkout callback both arriving.

### What I changed after the first pass

- Moved the Razorpay call out of the DB transaction (transactions can be retried; Razorpay must not be called twice).
- Create a separate "payment attempts" table: one payment per order, retried until captured, is simpler.
- Create "cancel order" to stay in the timebox.
- Would add a common error format for all errors (validation errors still use Nest's default shape).

### Week 2 with real shoppers

First, a reconciliation job that compares recent Razorpay payments with our orders, to catch missed webhooks and stuck orders. Then automatic refunds for the "paid but no stock" and partial-payment cases, behind the human-approval step from the bonus schema. Also: replace the demo tokens with real login, add a queue in front of the webhook, structured logs and alerts on payment failures, and rate limits on order creation.

### Assumptions

- INR only. No tax, shipping, coupons or addresses.
- Max 10 per item, 20 items per order.
- Customers can't cancel; unpaid orders expire.
- Login is a hardcoded demo token.
