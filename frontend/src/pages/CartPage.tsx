// frontend/src/pages/CartPage.tsx

import "./CartPage.css";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PaymentButton from "../components/cart/PaymentButton";
import { useContext } from "react";
import { Link } from "react-router-dom";
import CartContext from "../context/CartContext";
import { resolveMenuImageUrl } from "../utils/menuImage";
import { getOutletMetaById } from "../utils/orderPortal";
import { getVendorClosureLabel, getVendorOutletStatus } from "../utils/vendorPortal";

function CartPage() {
  const ctx = useContext(CartContext);
  if (!ctx) return null;

  const { state, increment, decrement, removeItem, clear, total } = ctx;
  const items = state.items;
  const subtotal = total();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const outletMeta = items[0]?.canteenId ? getOutletMetaById(items[0].canteenId) : null;
  const isOutletOpen = outletMeta ? getVendorOutletStatus(outletMeta.name) : true;
  const closureLabel = outletMeta ? getVendorClosureLabel(outletMeta.name) : null;

  return (
    <div className="cart-page">
      <Navbar />

      <main className="cart-main">
        <div className="cart-header">
          <div className="cart-hero">
            <div className="cart-hero-copy">
              <span className="cart-eyebrow">Checkout Desk</span>
              <h1 className="cart-title">Review your order before payment</h1>
              <p className="cart-subtitle">
                {items.length === 0
                  ? "Your cart is empty"
                  : `${totalItems} item(s) from ${outletMeta?.name ?? "your selected outlet"} are ready for checkout.`}
              </p>
            </div>

            <div className="cart-hero-badges" aria-hidden={items.length === 0}>
              <div className="cart-badge">
                <span className="cart-badge-label">Pickup</span>
                <strong>{outletMeta?.estimatedTime ?? "10-15 min"}</strong>
              </div>
              <div className="cart-badge">
                <span className="cart-badge-label">Outlet</span>
                <strong>{outletMeta?.location ?? "Campus food court"}</strong>
              </div>
            </div>
          </div>
          {!isOutletOpen && outletMeta && (
            <div className="payment-error" style={{ marginTop: "1rem" }}>
              <span>{closureLabel ?? `${outletMeta.name} is temporarily closed for checkout. You can keep items in cart and try again once it reopens.`}</span>
            </div>
          )}

          <div className="cart-toolbar">
            <Link to="/explore" className="cart-toolbar-btn cart-toolbar-btn--ghost">
              Back to Canteen
            </Link>
            <button
              type="button"
              className="cart-toolbar-btn cart-toolbar-btn--danger"
              onClick={clear}
              disabled={items.length === 0}
            >
              Clear Cart
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">BH</div>
            <h2>Nothing here yet!</h2>
            <p>Browse our canteens and add some delicious food.</p>
            <Link to="/explore" className="cart-browse-btn">Browse Canteens</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-items-panel">
              <div className="cart-section-head">
                <div>
                  <span className="cart-section-label">Items in cart</span>
                  <h2>Your selections</h2>
                </div>
                <span className="cart-section-meta">{items.length} unique item(s)</span>
              </div>

              <div className="cart-items" role="list" aria-label="Cart items">
                {items.map((item, index) => (
                  <article
                    key={item.id}
                    className="cart-item"
                    role="listitem"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    {item.image ? (
                      <img
                        src={resolveMenuImageUrl(item.image)}
                        alt={item.name}
                        className="cart-item-img"
                      />
                    ) : (
                      <div className="cart-item-img cart-item-img--placeholder" aria-hidden="true">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="cart-item-info">
                      <div className="cart-item-copy">
                        <h3 className="cart-item-name">{item.name}</h3>
                        <p className="cart-item-meta">
                          {outletMeta?.name ?? "Campus outlet"} • ₹{item.price.toFixed(2)} each
                        </p>
                      </div>

                      <div className="cart-item-footer">
                        <div className="cart-item-controls">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => decrement(item.id)}
                            aria-label={`Decrease quantity for ${item.name}`}
                          >
                            −
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => increment(item.id)}
                            aria-label={`Increase quantity for ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="cart-item-remove"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="cart-item-subtotal">
                      <span className="cart-item-subtotal-label">Item total</span>
                      <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="cart-summary">
              <div className="summary-chip">Secure checkout</div>
              <h2 className="summary-title">Order Summary</h2>
              <p className="summary-subtitle">
                Payment gateway stays active. Review the amount and continue to Razorpay.
              </p>

              <div className="summary-lines">
                <div className="summary-line">
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>
                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-line">
                  <span>Taxes & fees</span>
                  <span>Included</span>
                </div>
              </div>

              <div className="summary-mini-list">
                {items.map((item) => (
                  <div key={item.id} className="summary-mini-row">
                    <span>{item.name} x {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="summary-divider" />

              <div className="summary-total">
                <span>Total payable</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-taxes">
                <span>{outletMeta?.name ?? "Selected outlet"}</span>
                <span>{outletMeta?.estimatedTime ?? "10-15 minutes"}</span>
              </div>

              <PaymentButton
                items={items}
                total={subtotal}
                canteenId={items[0]?.canteenId ?? "default"}
                onPaymentStart={() => console.log("Payment started")}
                onPaymentSuccess={(paymentId, orderId) =>
                  console.log("Paid:", paymentId, orderId)
                }
                onPaymentFailure={(err) => console.error("Payment failed:", err)}
              />

              <Link to="/explore" className="summary-secondary-btn">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default CartPage;
