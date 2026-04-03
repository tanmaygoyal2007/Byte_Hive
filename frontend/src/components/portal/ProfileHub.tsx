import { CheckCircle2, ChevronLeft, Clock3, Heart, LogIn, LogOut, Package, ShoppingBag, Star, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getOrdersForUser,
  getOrdersSummaryTimestamp,
  getQrValueForOrder,
  subscribeToOrders,
  type ByteHiveOrder,
} from "../../utils/orderPortal";
import "./ProfileHub.css";

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

type View = "home" | "active-order" | "order-history" | "favorites";

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
  const [currentView, setCurrentView] = useState<View>("home");
  const [orders, setOrders] = useState<ByteHiveOrder[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentView("home");
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (currentView !== "home") {
          setCurrentView("home");
          return;
        }
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, currentView, onClose]);

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

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "collected").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [orders]
  );

  const activeOrder = useMemo(() => {
    return activeOrders[0] ?? null;
  }, [activeOrders]);

  const orderHistory = useMemo(
    () => orders.filter((order) => order.status === "collected").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [orders]
  );

  const favorites = [
    { id: 1, name: "Butter Chicken", outlet: "Punjabi Bites", price: "Rs180" },
    { id: 2, name: "Paneer Tikka", outlet: "Taste of Delhi", price: "Rs150" },
    { id: 3, name: "Masala Chai", outlet: "Cafe Coffee Day", price: "Rs20" },
  ];

  if (!isOpen) return null;

  const goBack = () => setCurrentView("home");

  const renderHeader = () => (
    <div className="profile-hub-shell-header">
      <h2>{currentView === "home" ? "Profile" : currentView === "active-order" ? "Active Order" : currentView === "order-history" ? "Order History" : "Favorite Items"}</h2>
      <button type="button" className="profile-hub-close" onClick={onClose} aria-label="Close profile hub">
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
                <div className="profile-highlight-row">
                  <strong>Current Order</strong>
                  <span className="profile-status-badge">{activeOrder.status}</span>
                </div>
                <p>{activeOrder.outletName}</p>
                <small>Order #{activeOrder.id}</small>
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
            <button type="button" className="profile-action-card" onClick={() => setCurrentView("order-history")}>
              <span className="profile-action-icon"><Package size={20} /></span>
              <span><strong>Order History</strong><small>View past orders</small></span>
            </button>
            <button type="button" className="profile-action-card" onClick={() => setCurrentView("favorites")}>
              <span className="profile-action-icon"><Heart size={20} /></span>
              <span><strong>Favorite Items</strong><small>Quick add favorites</small></span>
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
              <div className="profile-panel-card">
                <div className="profile-highlight-row">
                  <div>
                    <strong>{order.outletName}</strong>
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
                  <span>Pickup Point</span>
                  <strong>{order.pickupLocation}</strong>
                </div>
                <div className="profile-order-item-row">
                  <span>Last Updated</span>
                  <strong>{getOrdersSummaryTimestamp(order.updatedAt)}</strong>
                </div>
              </div>

              <div className="profile-panel-card">
                <h3>Status Timeline</h3>
                <div className={`profile-timeline-item ${["preparing", "accepted", "ready", "collected"].includes(order.status) ? "profile-timeline-complete" : ""}`}><CheckCircle2 size={18} /><span>Preparing</span></div>
                <div className={`profile-timeline-item ${["accepted", "ready", "collected"].includes(order.status) ? "profile-timeline-complete" : ""}`}><CheckCircle2 size={18} /><span>Accepted</span></div>
                <div className={`profile-timeline-item ${["ready", "collected"].includes(order.status) ? "profile-timeline-complete" : ""}`}><CheckCircle2 size={18} /><span>Ready for Pickup</span></div>
                <div className={`profile-timeline-item ${order.status === "collected" ? "profile-timeline-complete" : ""}`}><Clock3 size={18} /><span>Collected</span></div>
              </div>

              {order.status === "ready" && (
                <div className="profile-qr-card">
                  <div className="profile-qr-box">
                    <QRCodeSVG value={getQrValueForOrder(order.id)} size={170} />
                  </div>
                  <p>Show this QR code at the counter to collect your order.</p>
                </div>
              )}
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
          </div>
        )) : <div className="profile-panel-card"><p>No completed orders yet. Your collected orders will show here.</p></div>}
      </div>
    </>
  );

  const renderFavoritesView = () => (
    <>
      {renderBackButton()}
      <div className="profile-stack">
        {favorites.map((item) => (
          <div key={item.id} className="profile-panel-card profile-favorite-row">
            <div className="profile-favorite-copy">
              <div className="profile-favorite-title"><Star size={16} /> <strong>{item.name}</strong></div>
              <p>{item.outlet}</p>
            </div>
            <div className="profile-favorite-side">
              <strong>{item.price}</strong>
              <button type="button">+ Add</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const content = currentView === "home"
    ? renderHomeView()
    : currentView === "active-order"
      ? renderActiveOrderView()
      : currentView === "order-history"
        ? renderOrderHistoryView()
        : renderFavoritesView();

  return (
    <div className="profile-hub-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="User profile hub">
      <div className={`profile-hub-shell ${isMobile ? "profile-hub-shell-mobile" : "profile-hub-shell-desktop"}`} onClick={(event) => event.stopPropagation()}>
        {renderHeader()}
        <div className="profile-hub-content">{content}</div>
      </div>
    </div>
  );
}

export default ProfileHub;
