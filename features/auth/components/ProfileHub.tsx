import { CheckCircle2, ChevronLeft, Clock3, Heart, LogIn, LogOut, Package, ShoppingBag, Star, Trash2, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link, useNavigate } from "@/components/lib/router";
import useCart from "@/features/cart/hooks/useCart";
import useSecondClock from "@/components/hooks/useSecondClock";
import { resolveMenuImageUrl } from "@/features/menu/services/menu-image.service";
import {
  formatScheduledOrderLabel,
  getFavoriteItemsForUser,
  getOrderCountdownState,
  getOrderDelayCopy,
  getOrderEtaLabel,
  getOrdersForUser,
  getOrdersSummaryTimestamp,
  getQrValueForOrder,
  getRelativeTimeLabel,
  removeFavoriteItemForUser,
  subscribeToFavorites,
  subscribeToOrders,
  type ByteHiveOrder,
  type FavoriteMenuItem,
} from "@/features/orders/services/order-portal.service";

type ProfileHubProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onRequestAuth: (role?: "student" | "faculty") => void;
  userName: string;
  userRole: "student" | "faculty" | "guest";
  isGuest?: boolean;
  isMobile?: boolean;
  hasActiveOrder?: boolean;
};

type View = "home" | "active-order" | "scheduled-orders" | "order-history" | "favorites" | "cart";

function ProfileHub({
  isOpen,
  onClose,
  onLogout,
  onRequestAuth,
  userName,
  userRole,
  isGuest = false,
  isMobile = false,
}: ProfileHubProps) {
  const { state, addItem, increment, decrement, removeItem, total } = useCart();
  const now = useSecondClock();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<View>("home");
  const [orders, setOrders] = useState<ByteHiveOrder[]>([]);
  const [favorites, setFavorites] = useState<FavoriteMenuItem[]>([]);
  const handleClose = useCallback(() => {
    setCurrentView("home");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (currentView !== "home") {
          setCurrentView("home");
          return;
        }
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [currentView, handleClose, isOpen]);

  useEffect(() => {
    const syncOrders = () => {
      if (isGuest) {
        setOrders([]);
        return;
      }
      setOrders(getOrdersForUser(userName).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    };

    syncOrders();
    return subscribeToOrders(syncOrders);
  }, [isGuest, userName]);

  useEffect(() => {
    const syncFavorites = () => {
      if (isGuest) {
        setFavorites([]);
        return;
      }

      setFavorites(getFavoriteItemsForUser(userName));
    };

    syncFavorites();
    return subscribeToFavorites(syncFavorites);
  }, [isGuest, userName]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "collected").sort((a, b) => {
      if (a.status === "scheduled" && b.status !== "scheduled") return 1;
      if (a.status !== "scheduled" && b.status === "scheduled") return -1;
      return b.updatedAt.localeCompare(a.updatedAt);
    }),
    [orders]
  );

  const activeOrder = useMemo(() => {
    return activeOrders.find((order) => order.status !== "scheduled") ?? null;
  }, [activeOrders]);

  const scheduledOrders = useMemo(
    () => orders.filter((order) => order.status === "scheduled").sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? "")),
    [orders]
  );

  const orderHistory = useMemo(
    () => orders.filter((order) => order.status === "collected").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [orders]
  );

  if (!isOpen) return null;

  const goBack = () => setCurrentView("home");

  const handleFavoriteAdd = (item: FavoriteMenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      canteenId: item.canteenId,
    });
  };

  const handleFavoriteRemove = (itemId: string) => {
    removeFavoriteItemForUser(userName, itemId);
  };

  const getCartQuantityForFavorite = (itemId: string) => {
    return state.items.find((item: { id: string; quantity: number }) => item.id === itemId)?.quantity ?? 0;
  };

  const renderHeader = () => (
    <div className="profile-hub-shell-header">
      <h2>
        {currentView === "home"
          ? "Profile"
          : currentView === "active-order"
            ? "Active Order"
            : currentView === "order-history"
              ? "Order History"
              : currentView === "favorites"
                ? "Favorite Items"
                : "Cart"}
      </h2>
      <button type="button" className="profile-hub-close" onClick={handleClose} aria-label="Close profile hub">
        <X size={20} />
      </button>
    </div>
  );

  const renderBackButton = () => (
    <button type="button" className="profile-hub-back" onClick={goBack}>
      <ChevronLeft size={16} />
      Back to Profile
    </button>
  );

  const renderGuestCard = () => (
    <div className="profile-guest-card">
      <div className="profile-guest-glass">
        <strong>Unlock your ByteHive account</strong>
        <p>Login or sign up as a student or faculty member to save favorites, track orders, and keep your profile synced.</p>
          <div className="profile-guest-feature-list">
          <div className="profile-guest-feature-item">
            <span className="profile-action-icon"><ShoppingBag size={18} /></span>
            <span><strong>Active Order</strong><small>View current order status</small></span>
          </div>
          <div className="profile-guest-feature-item">
            <span className="profile-action-icon"><Package size={18} /></span>
            <span><strong>Order History</strong><small>View past orders</small></span>
          </div>
          <div className="profile-guest-feature-item">
            <span className="profile-action-icon"><Heart size={18} /></span>
            <span><strong>Favorite Items</strong><small>Quick add favorites</small></span>
          </div>
          <div className="profile-guest-feature-item">
            <span className="profile-action-icon"><ShoppingBag size={18} /></span>
            <span><strong>Cart</strong><small>Review items before checkout</small></span>
          </div>
        </div>
        <div className="profile-guest-actions">
          <button type="button" onClick={() => onRequestAuth("student")}><LogIn size={16} />Login as Student</button>
          <button type="button" className="profile-guest-secondary" onClick={() => onRequestAuth("faculty")}><UserPlus size={16} />Sign up as Faculty</button>
          <button type="button" className="profile-guest-tertiary" onClick={() => { onLogout(); onClose(); }}><LogOut size={16} />Exit Guest Mode</button>
        </div>
      </div>
    </div>
  );

  const renderHomeView = () => (
    <>
      {isGuest ? renderGuestCard() : (
        <>
          <div className="profile-home-top">
            <div className="profile-user-card">
              <div className="profile-user-avatar">{userName.charAt(0).toUpperCase()}</div>
              <div>
                <h3>{userName}</h3>
                <span className="profile-user-role">{userRole}</span>
              </div>
            </div>

            {activeOrder ? (
              <div className="profile-highlight-card">
                {(() => {
                  const countdown = getOrderCountdownState(activeOrder, now);
                  return (
                    <>
                <div className="profile-highlight-row">
                  <strong>Current Order</strong>
                  <span className="profile-status-badge">{activeOrder.status}</span>
                </div>
                <div>
                  <strong>{activeOrder.outletName}</strong>
                  <br />
                  <small>Order #{activeOrder.id}</small>
                </div>
                {countdown.isActive && (
                  <div className={`profile-home-timer ${countdown.isDelayed ? "profile-home-timer-delayed" : ""}`}>
                    <strong>{countdown.clockLabel}</strong>
                    <span>{countdown.isDelayed ? "Order delayed" : "Preparation countdown"}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="profile-action-link profile-action-link-small"
                  onClick={() => navigate(`/receipt?orderId=${activeOrder.id}`)}
                >
                  View Receipt
                </button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="profile-highlight-card">
                <div className="profile-highlight-row"><strong>No Active Order</strong></div>
                <p>Your next ByteHive order will appear here.</p>
                <small>Browse the menu to place your next order.</small>
              </div>
            )}
          </div>

          <div className="profile-actions">
            <button type="button" className="profile-action-card" onClick={() => setCurrentView("active-order")}>
              <span className="profile-action-icon"><ShoppingBag size={20} /></span>
              <span><strong>Active Order</strong><small>View current order status</small></span>
            </button>
            {scheduledOrders.length > 0 && (
              <button type="button" className="profile-action-card" onClick={() => setCurrentView("scheduled-orders")}>
                <span className="profile-action-icon"><Clock3 size={20} /></span>
                <span><strong>Scheduled Orders</strong><small>{scheduledOrders.length} upcoming</small></span>
              </button>
            )}
            <button type="button" className="profile-action-card" onClick={() => setCurrentView("order-history")}>
              <span className="profile-action-icon"><Package size={20} /></span>
              <span><strong>Order History</strong><small>View past orders</small></span>
            </button>
            <button type="button" className="profile-action-card" onClick={() => setCurrentView("favorites")}>
              <span className="profile-action-icon"><Heart size={20} /></span>
              <span><strong>Favorite Items</strong><small>Quick add favorites</small></span>
            </button>
            <button type="button" className="profile-action-card" onClick={() => setCurrentView("cart")}>
              <span className="profile-action-icon"><ShoppingBag size={20} /></span>
              <span><strong>Cart</strong><small>Review and manage cart items</small></span>
            </button>
            <button type="button" className="profile-logout" onClick={() => { onLogout(); onClose(); }}>
              <LogIn size={18} />
              Logout
            </button>
          </div>
        </>
      )}
    </>
  );

  const renderActiveOrderView = () => (
    <>
      {renderBackButton()}
      {!activeOrders.length ? (
        <div className="profile-panel-card"><p>No active order right now. Place a new order to track it here.</p></div>
      ) : (
        <>
          {activeOrders.map((order) => (
            <div key={order.id} className="profile-stack">
              {(() => {
                const countdown = getOrderCountdownState(order, now);
                return (
                  <>
              <div className="profile-panel-card">
                <div className="profile-highlight-row">
                  <div>
                    <strong>{order.outletName}</strong>
                    <br />
                    <small>Order #{order.id}</small>
                  </div>
                  <span className="profile-status-badge">{order.status}</span>
                </div>
                <div className="profile-order-items">
                  {order.items.map((item) => (
                    <div key={`${order.id}-${item.id}`} className="profile-order-item-row">
                      <span>{item.name} x{item.quantity}</span>
                      <strong>Rs {item.price * item.quantity}</strong>
                    </div>
                  ))}
                </div>
                <div className="profile-order-item-row profile-order-total">
                  <span>Total</span>
                  <strong>Rs {order.total}</strong>
                </div>
                <div className="profile-order-item-row">
                  <span>Estimated Pickup</span>
                  <strong>{getOrderEtaLabel(order)}</strong>
                </div>
                {countdown.isActive && (
                  <div className="profile-order-item-row">
                    <span>{countdown.isDelayed ? "Timer Paused" : "Live Timer"}</span>
                    <strong className={countdown.isDelayed ? "profile-order-timer profile-order-timer-delayed" : "profile-order-timer"}>
                      {countdown.clockLabel}
                    </strong>
                  </div>
                )}
                <div className="profile-order-item-row">
                  <span>Pickup Point</span>
                  <strong>{order.pickupLocation}</strong>
                </div>
                <div className="profile-order-item-row">
                  <span>Last Updated</span>
                  <strong>{getOrdersSummaryTimestamp(order.updatedAt)}</strong>
                </div>
                {order.vendorTimingUpdatedAt && (
                  <div className="profile-order-item-row">
                    <span>ETA Updated</span>
                    <strong>{getRelativeTimeLabel(order.vendorTimingUpdatedAt, now)}</strong>
                  </div>
                )}
                {getOrderDelayCopy(order) && (
                  <div className="profile-order-delay-note">
                    <strong>Delay Notice</strong>
                    <p>{getOrderDelayCopy(order)}</p>
                  </div>
                )}
              </div>

              <div className="profile-panel-card">
                <h3>Status Timeline</h3>
                <div className="profile-timeline-item profile-timeline-complete"><CheckCircle2 size={18} /><span>Accepted</span></div>
                <div className={`profile-timeline-item ${["preparing", "accepted", "ready", "handoff", "collected"].includes(order.status) ? "profile-timeline-complete" : ""}`}><CheckCircle2 size={18} /><span>Preparing</span></div>
                <div className={`profile-timeline-item ${["ready", "handoff", "collected"].includes(order.status) ? "profile-timeline-complete" : ""}`}><CheckCircle2 size={18} /><span>Ready for Pickup</span></div>
                <div className={`profile-timeline-item ${["handoff", "collected"].includes(order.status) ? "profile-timeline-complete" : ""}`}><CheckCircle2 size={18} /><span>Counter Verified</span></div>
                <div className={`profile-timeline-item ${order.status === "collected" ? "profile-timeline-complete" : ""}`}><Clock3 size={18} /><span>Collected</span></div>
              </div>

              {(order.status === "ready" || order.status === "handoff") && (
                <div className="profile-qr-card">
<div className="profile-qr-box">
                    <QRCodeSVG value={getQrValueForOrder(order)} size={170} />
                  </div>
                  <p>
                    {order.status === "handoff"
                      ? "Your QR has been verified at the counter. Confirm pickup once the food is handed over."
                      : "Show this QR code at the counter to collect your order."}
                  </p>
                  <p>Pickup code: <strong>{order.pickupCode}</strong></p>
                </div>
              )}

              <button
                type="button"
                className="profile-action-link"
                onClick={() => navigate(`/receipt?orderId=${order.id}`)}
              >
                View Receipt
              </button>
                   </>
                 );
               })()}
             </div>
           ))}
         </>
       )}
     </>
   );

  const renderOrderHistoryView = () => (
    <>
      {renderBackButton()}
      <div className="profile-stack">
        {orderHistory.length ? orderHistory.map((order) => (
          <div key={order.id} className="profile-panel-card">
            <div className="profile-order-item-row">
              <strong>{order.outletName}</strong>
              <strong>Rs {order.total}</strong>
            </div>
            <p>{getOrdersSummaryTimestamp(order.updatedAt)}</p>
            <small>Order #{order.id}</small>
            <button
              type="button"
              className="profile-action-link"
              onClick={() => navigate(`/receipt?orderId=${order.id}`)}
            >
              View Receipt
            </button>
          </div>
        )) : <div className="profile-panel-card"><p>No completed orders yet. Your collected orders will show here.</p></div>}
      </div>
    </>
  );

  const renderScheduledOrdersView = () => (
    <>
      {renderBackButton()}
      <div className="profile-panel-header">
        <h3>Scheduled Orders</h3>
        <p>Your upcoming orders waiting for their scheduled time.</p>
      </div>
      {scheduledOrders.length ? scheduledOrders.map((order) => (
        <div key={order.id} className="profile-panel-card">
          <div className="profile-highlight-row">
            <div>
              <strong>{order.outletName}</strong>
              <br />
              <small>Order #{order.id}</small>
            </div>
            <span className="profile-status-badge">Scheduled</span>
          </div>
          <div className="profile-order-items">
            {order.items.map((item) => (
              <div key={`${order.id}-${item.id}`} className="profile-order-item-row">
                <span>{item.name} x{item.quantity}</span>
                <strong>Rs {item.price * item.quantity}</strong>
              </div>
            ))}
          </div>
          <div className="profile-order-item-row profile-order-total">
            <span>Total</span>
            <strong>Rs {order.total}</strong>
          </div>
          <div className="profile-order-item-row">
            <span>Scheduled for</span>
            <strong>{formatScheduledOrderLabel(order.scheduledFor)}</strong>
          </div>
          <button
            type="button"
            className="profile-action-link"
            onClick={() => navigate(`/receipt?orderId=${order.id}`)}
          >
            View Receipt
          </button>
        </div>
      )) : <div className="profile-panel-card"><p>No scheduled orders.</p></div>}
    </>
  );

  const renderFavoritesView = () => (
    <>
      {renderBackButton()}
      <div className="profile-favorites-grid">
        {favorites.length ? favorites.map((item) => (
          <div key={item.id} className="profile-favorite-card">
            <div className="profile-favorite-image-wrapper">
              <img
                src={resolveMenuImageUrl(item.image) || "/placeholder.svg"}
                alt={item.name}
                className="profile-favorite-image"
              />
              <button
                type="button"
                className="profile-favorite-card-remove"
                onClick={() => handleFavoriteRemove(item.id)}
                aria-label="Remove from favorites"
              >
                <X size={14} />
              </button>
              {item.isVeg !== undefined && (
                <span className={`profile-favorite-veg ${item.isVeg ? "veg" : "non-veg"}`}>
                  {item.isVeg ? "●" : "■"}
                </span>
              )}
            </div>
            <div className="profile-favorite-content">
              <h4>{item.name}</h4>
              <p className="profile-favorite-outlet">{item.outletName}</p>
              <div className="profile-favorite-bottom">
                <span className="profile-favorite-price">Rs {item.price}</span>
                {getCartQuantityForFavorite(item.id) > 0 ? (
                  <div className="profile-favorite-qty">
                    <button type="button" onClick={() => decrement(item.id)}>-</button>
                    <span>{getCartQuantityForFavorite(item.id)}</span>
                    <button type="button" onClick={() => increment(item.id)}>+</button>
                  </div>
                ) : (
                  <button type="button" className="profile-favorite-add-btn" onClick={() => handleFavoriteAdd(item)}>
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        )) : (
          <div className="profile-panel-card profile-favorites-empty">
            <Star size={32} />
            <strong>No favorites yet</strong>
            <p>Tap the star beside any menu item to save it here for quick reordering.</p>
          </div>
        )}
      </div>
    </>
  );

  const renderCartView = () => (
    <>
      {renderBackButton()}
      <div className="profile-panel-card">
        <h3>Your Cart</h3>
        {!state.items.length ? (
          <p>Your cart is empty. Add items from the menu or your favorites to get started.</p>
        ) : (
          <>
            <div className="profile-cart-list">
              {state.items.map((item: { id: string; image?: string; name: string; price: number; quantity: number }) => (
                <div key={item.id} className="profile-cart-item">
                  <img src={resolveMenuImageUrl(item.image) || "/placeholder.svg"} alt={item.name} className="profile-cart-image" />
                  <div className="profile-cart-copy">
                    <strong>{item.name}</strong>
                    <small>Rs {item.price}</small>
                    <div className="profile-cart-qty">
                      <button type="button" onClick={() => decrement(item.id)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => increment(item.id)}>+</button>
                    </div>
                  </div>
                  <button type="button" className="profile-cart-remove" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="profile-cart-footer">
              <div className="profile-cart-total">
                <span>Total</span>
                <strong>Rs {total()}</strong>
              </div>
              <Link to="/cart" className="profile-cart-link" onClick={handleClose}>
                Open Full Cart
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );

  const content = currentView === "home"
    ? renderHomeView()
    : currentView === "active-order"
      ? renderActiveOrderView()
      : currentView === "scheduled-orders"
        ? renderScheduledOrdersView()
        : currentView === "order-history"
          ? renderOrderHistoryView()
          : currentView === "favorites"
            ? renderFavoritesView()
            : renderCartView();

  return (
    <div className="profile-hub-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-label="User profile hub">
      <div className={`profile-hub-shell ${isMobile ? "profile-hub-shell-mobile" : "profile-hub-shell-desktop"}`} onClick={(event) => event.stopPropagation()}>
        {renderHeader()}
        <div className="profile-hub-content">{content}</div>
      </div>
    </div>
  );
}

export default ProfileHub;
