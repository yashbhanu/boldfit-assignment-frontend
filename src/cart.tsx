import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Product } from './api'

export interface CartLine {
  sku: string
  name: string
  price: number
  quantity: number
}

interface CartState {
  lines: CartLine[]
  // Sent as Idempotency-Key when placing the order. Stays the same while the
  // cart is unchanged, so a double-click or a retry after a network error
  // can't create a second order. A new key is made whenever the cart changes.
  checkoutKey: string
}

interface CartContextValue extends CartState {
  add: (product: Product) => void
  setQuantity: (sku: string, quantity: number) => void
  clear: () => void
}

const STORAGE_KEY = 'cart'
const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): CartState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as CartState
  } catch {      }
  return { lines: [], checkoutKey: crypto.randomUUID() }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(loadCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  const update = (lines: CartLine[]) => setCart({ lines, checkoutKey: crypto.randomUUID() })

  const value: CartContextValue = {
    ...cart,
    add: (product) => {
      const existing = cart.lines.find((l) => l.sku === product.sku)
      update(
        existing
          ? cart.lines.map((l) => (l.sku === product.sku ? { ...l, quantity: l.quantity + 1 } : l))
          : [...cart.lines, { sku: product.sku, name: product.name, price: product.price, quantity: 1 }],
      )
    },
    setQuantity: (sku, quantity) =>
      update(
        quantity <= 0
          ? cart.lines.filter((l) => l.sku !== sku)
          : cart.lines.map((l) => (l.sku === sku ? { ...l, quantity } : l)),
      ),
    clear: () => update([]),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
