import "./MiniCart.css";
import useCart from "../../hooks/useCart";
import { Link } from "react-router-dom";

function MiniCart() {
    const { state, increment, decrement, removeItem, total } = useCart();
    const isEmpty = state.items.length === 0;

    return (
        <div className="mini-cart">
            <h4>🛒 Your Cart</h4>
            <div className="mini-cart-body">
                {isEmpty ? (
                    <div className="empty-cart">Cart is empty<br/><small>Add items to get started</small></div>
                ) : (
                    <div className="mini-items">
                        {state.items.map((it: any) => (
                            <div key={it.id} className="mini-item">
                                <img src={it.image || '/placeholder.svg'} alt={it.name} />
                                <div className="mini-item-info">
                                    <div className="mini-item-name">{it.name}</div>
                                    <div className="mini-item-price">₹{it.price}</div>
                                    <div className="mini-item-qty">
                                        <button type="button" onClick={() => decrement(it.id)}>-</button>
                                        <span>{it.quantity}</span>
                                        <button type="button" onClick={() => increment(it.id)}>+</button>
                                    </div>
                                </div>
                                <button className="mini-item-remove" type="button" aria-label={`Remove ${it.name}`} onClick={() => removeItem(it.id)}>🗑</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mini-cart-footer">
                <div className="mini-total">Total <span>₹{total()}</span></div>
                <Link to={isEmpty ? "#" : "/cart"} className={`checkout-btn${isEmpty ? " checkout-btn-disabled" : ""}`} onClick={event => {
                    // Prevent navigation when the cart is empty but keep the button layout stable.
                    if (isEmpty) {
                        event.preventDefault();
                    }
                }}>
                    Proceed to Checkout
                </Link>
            </div>
        </div>
    )
}

export default MiniCart;
