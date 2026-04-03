import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUserSession, subscribeToUserSession, type UserSession } from "../../utils/orderPortal";
import useCart from "../../hooks/useCart";
import "./MiniCart.css";

function MiniCart() {
  const { state, increment, decrement, removeItem, total } = useCart();
  const [session, setSession] = useState<UserSession | null>(() => getCurrentUserSession());
  const canOpenCart = !!session && state.items.length > 0;

  useEffect(() => {
    const syncSession = () => setSession(getCurrentUserSession());
    return subscribeToUserSession(syncSession);
  }, []);

  return (
    <div className="mini-cart">
      <h4>Your Cart</h4>

      <div className="mini-cart-body">
        {state.items.length === 0 ? (
          <div className="empty-cart">
            Cart is empty
            <br />
            <small>Add items to get started</small>
          </div>
        ) : (
          <div className="mini-items">
            {state.items.map((item: { id: string; image?: string; name: string; price: number; quantity: number }) => (
              <div key={item.id} className="mini-item">
                <img src={item.image || "/placeholder.svg"} alt={item.name} />

                <div className="mini-item-info">
                  <div className="mini-item-name">{item.name}</div>
                  <div className="mini-item-price">Rs {item.price}</div>
                  <div className="mini-item-qty">
                    <button type="button" onClick={() => decrement(item.id)}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => increment(item.id)}>+</button>
                  </div>
                </div>

                <button type="button" className="mini-item-remove" onClick={() => removeItem(item.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mini-cart-footer">
        <div className="mini-total">
          Total <span>Rs {total()}</span>
        </div>

        {canOpenCart ? (
          <Link to="/cart" className="checkout-btn">Proceed to Checkout</Link>
        ) : (
          <button type="button" className="checkout-btn" disabled>
            Proceed to Checkout
          </button>
        )}
      </div>
    </div>
  );
}

export default MiniCart;
