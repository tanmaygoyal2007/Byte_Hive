import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUserSession, getOutletMetaById, subscribeToUserSession, type UserSession } from "../../utils/orderPortal";
import { resolveMenuImageUrl } from "../../utils/menuImage";
import { getVendorClosureLabel, getVendorOutletStatus, subscribeToVendorStatus } from "../../utils/vendorPortal";
import useCart from "../../hooks/useCart";
import "./MiniCart.css";

function MiniCart() {
  const { state, increment, decrement, removeItem, total } = useCart();
  const [session, setSession] = useState<UserSession | null>(() => getCurrentUserSession());
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [isOutletOpen, setIsOutletOpen] = useState(true);
  const [closureLabel, setClosureLabel] = useState<string | null>(null);
  const isEmpty = state.items.length === 0;
  const cartOutletId = state.items[0]?.canteenId ?? null;
  const cartOutletName = cartOutletId ? getOutletMetaById(cartOutletId).name : null;
  const canOpenCart = !!session && !isEmpty;
  const isCheckoutBlocked = canOpenCart && !isOutletOpen;

  useEffect(() => {
    const syncSession = () => setSession(getCurrentUserSession());
    return subscribeToUserSession(syncSession);
  }, []);

  useEffect(() => {
    const syncVendorStatus = () => {
      if (!cartOutletName) {
        setIsOutletOpen(true);
        setClosureLabel(null);
        return;
      }

      setIsOutletOpen(getVendorOutletStatus(cartOutletName));
      setClosureLabel(getVendorClosureLabel(cartOutletName));
    };

    syncVendorStatus();
    const unsubscribe = subscribeToVendorStatus(syncVendorStatus);
    const interval = window.setInterval(syncVendorStatus, 30000);

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [cartOutletName]);

  return (
    <div className="mini-cart">
      <h4>🛒 Your Cart</h4>

      <div className="mini-cart-body">
        {isEmpty ? (
          <div className="empty-cart">
            Cart is empty
            <br />
            <small>Add items to get started</small>
          </div>
        ) : (
          <div className="mini-items">
            {state.items.map((item: { id: string; image?: string; name: string; price: number; quantity: number }) => (
              <div key={item.id} className="mini-item">
                <img src={resolveMenuImageUrl(item.image) || "/placeholder.svg"} alt={item.name} />

                <div className="mini-item-info">
                  <div className="mini-item-name">{item.name}</div>
                  <div className="mini-item-price">₹{item.price}</div>
                  <div className="mini-item-qty">
                    <button type="button" onClick={() => decrement(item.id)}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => increment(item.id)}>+</button>
                  </div>
                </div>

                <button type="button" className="mini-item-remove" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)}>
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mini-cart-footer">
        {isCheckoutBlocked && (
          <div className="mini-cart-warning">
            <strong>{cartOutletName} is closed for checkout.</strong>
            <p>{closureLabel ?? "You can keep items in cart and try again once the outlet reopens."}</p>
          </div>
        )}

        {checkoutNotice && (
          <div className="mini-cart-notice" role="status">
            {checkoutNotice}
          </div>
        )}

        <div className="mini-total">
          Total <span>₹{total()}</span>
        </div>

        <Link
          to={canOpenCart ? "/cart" : "#"}
          className={`checkout-btn${canOpenCart ? "" : " checkout-btn-disabled"}${isCheckoutBlocked ? " checkout-btn-blocked" : ""}`}
          onClick={(event) => {
            if (!canOpenCart) {
              event.preventDefault();
              return;
            }

            if (isCheckoutBlocked) {
              event.preventDefault();
              setCheckoutNotice(closureLabel ?? `${cartOutletName} is temporarily closed for checkout.`);
              window.setTimeout(() => setCheckoutNotice(null), 2600);
            }
          }}
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}

export default MiniCart;
