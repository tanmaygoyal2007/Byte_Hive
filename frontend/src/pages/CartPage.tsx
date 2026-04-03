// frontend/src/pages/CartPage.tsx

import "./CartPage.css";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PaymentButton from "../components/cart/PaymentButton";
import { useContext } from "react";
import CartContext from "../context/CartContext";

function CartPage() {
  const ctx = useContext(CartContext);
  if (!ctx) return null;

  const { state, increment, decrement, removeItem, total } = ctx;
  const items = state.items;

  return (
    <div className="cart-page">
      <Navbar />

      <main className="cart-main">
        <div className="cart-header">
          <h1 className="cart-title">
            <span className="cart-icon">🛒</span> Your Order
          </h1>
          <p className="cart-subtitle">
            {items.length === 0
              ? "Your cart is empty"
              : `${items.reduce((s, i) => s + i.quantity, 0)} item(s) ready to order`}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🍽️</div>
            <h2>Nothing here yet!</h2>
            <p>Browse our canteens and add some delicious food.</p>
            <a href="/canteens" className="cart-browse-btn">Browse Canteens</a>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Items list */}
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="cart-item-img"
                    />
                  )}
                  <div className="cart-item-info">
                    <h3 className="cart-item-name">{item.name}</h3>
                    <p className="cart-item-price">₹{item.price.toFixed(2)} each</p>
                  </div>

                  <div className="cart-item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => decrement(item.id)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => increment(item.id)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item-subtotal">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>

                  <button
                    className="cart-item-remove"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="cart-summary">
              <h2 className="summary-title">Order Summary</h2>

              <div className="summary-lines">
                {items.map((item) => (
                  <div key={item.id} className="summary-line">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="summary-divider" />

              <div className="summary-total">
                <span>Total</span>
                <span>₹{total().toFixed(2)}</span>
              </div>

              <div className="summary-taxes">
                <span>Taxes & fees</span>
                <span>Included</span>
              </div>

              {/* Payment Button — wired to CartContext */}
              <PaymentButton
                items={items}
                total={total()}
                canteenId={items[0]?.id?.split("-")[0] ?? "default"}
                onPaymentStart={() => console.log("Payment started")}
                onPaymentSuccess={(paymentId, orderId) =>
                  console.log("Paid:", paymentId, orderId)
                }
                onPaymentFailure={(err) => console.error("Payment failed:", err)}
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default CartPage;