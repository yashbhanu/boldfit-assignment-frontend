import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { CartProvider, useCart } from './cart'
import { EmptyState } from './components/ui'
import { CartPage } from './pages/CartPage'
import { OrderPage } from './pages/OrderPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'

function Header() {
  const { lines } = useCart()
  const count = lines.reduce((sum, l) => sum + l.quantity, 0)
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`

  return (
    <header className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          <img src="/favicon.svg" alt="" className="logo-mark" />
          BOLDFIT
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={(state) => `${navClass(state)} hide-sm`}>
            Shop
          </NavLink>
          <NavLink to="/orders" className={navClass}>
            My orders
          </NavLink>
          <Link to="/cart" className="cart-button" aria-label={`Cart, ${count} items`}>
            🛒 Cart <span className="cart-count">{count}</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer>
      <div className="container">
        <span>© Boldfit · Demo store for a take-home assignment</span>
        <span>Payments run in Razorpay test mode · No real money is charged</span>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <div className="app">
          <Header />
          <main>
            <div className="container">
              <Routes>
                <Route path="/" element={<ProductsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderPage />} />
                <Route
                  path="*"
                  element={
                    <EmptyState icon="🧭" title="Page not found" text="The page you're looking for doesn't exist." cta={{ to: '/', label: 'Back to shop' }} />
                  }
                />
              </Routes>
            </div>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </BrowserRouter>
  )
}
