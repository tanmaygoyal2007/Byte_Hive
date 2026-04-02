import { CheckCircle2, ChevronLeft, Clock3, Heart, LogOut, Package, ShoppingBag, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./ProfileHub.css";

type ProfileHubProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  userName: string;
  userRole: "student" | "faculty";
  isMobile?: boolean;
  hasActiveOrder?: boolean;
};

type View = "home" | "active-order" | "order-history" | "favorites";

function ProfileHub({
  isOpen,
  onClose,
  onLogout,
  userName,
  userRole,
  isMobile = false,
  hasActiveOrder = true,
}: ProfileHubProps) {
  const [currentView, setCurrentView] = useState<View>("home");

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

  if (!isOpen) return null;

  const activeOrder = {
    id: "BH-2026-001",
    outlet: "Punjabi Bites",
    status: "ready" as "preparing" | "ready" | "collected",
    items: [
      { name: "Butter Chicken", quantity: 1, price: "Rs180" },
      { name: "Butter Naan", quantity: 2, price: "Rs40" },
    ],
    total: "Rs220",
    placedAt: "2:30 PM",
  };

  const orderHistory = [
    { id: "BH-2026-014", outlet: "Cafe Coffee Day", date: "Yesterday, 1:45 PM", total: "Rs280" },
    { id: "BH-2026-009", outlet: "Taste of Delhi", date: "2 days ago, 3:20 PM", total: "Rs520" },
    { id: "BH-2026-004", outlet: "Rolls Lane", date: "4 days ago, 12:15 PM", total: "Rs150" },
  ];

  const favorites = [
    { id: 1, name: "Butter Chicken", outlet: "Punjabi Bites", price: "Rs180" },
    { id: 2, name: "Paneer Tikka", outlet: "Taste of Delhi", price: "Rs150" },
    { id: 3, name: "Masala Chai", outlet: "Cafe Coffee Day", price: "Rs20" },
  ];

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

  const renderHomeView = () => (
    <>
      <div className="profile-user-card">
        <div className="profile-user-avatar">{userName.charAt(0).toUpperCase()}</div>
        <div>
          <h3>{userName}</h3>
          <span className="profile-user-role">{userRole}</span>
        </div>
      </div>

      {hasActiveOrder && (
        <div className="profile-highlight-card">
          <div className="profile-highlight-row">
            <strong>Current Order</strong>
            <span className="profile-status-badge">ready</span>
          </div>
          <p>{activeOrder.outlet}</p>
          <small>Order #{activeOrder.id}</small>
        </div>
      )}

      <div className="profile-actions">
        <button type="button" className="profile-action-card" onClick={() => setCurrentView("active-order")}>
          <span className="profile-action-icon"><ShoppingBag size={20} /></span>
          <span>
            <strong>Active Order</strong>
            <small>View current order status</small>
          </span>
        </button>

        <button type="button" className="profile-action-card" onClick={() => setCurrentView("order-history")}>
          <span className="profile-action-icon"><Package size={20} /></span>
          <span>
            <strong>Order History</strong>
            <small>View past orders</small>
          </span>
        </button>

        <button type="button" className="profile-action-card" onClick={() => setCurrentView("favorites")}>
          <span className="profile-action-icon"><Heart size={20} /></span>
          <span>
            <strong>Favorite Items</strong>
            <small>Quick add favorites</small>
          </span>
        </button>
      </div>

      <button type="button" className="profile-logout" onClick={() => { onLogout(); onClose(); }}>
        <LogOut size={18} />
        Logout
      </button>
    </>
  );

  const renderActiveOrderView = () => (
    <>
      {renderBackButton()}
      <div className="profile-panel-card">
        <div className="profile-highlight-row">
          <div>
            <strong>{activeOrder.outlet}</strong>
            <small>Order #{activeOrder.id}</small>
          </div>
          <span className="profile-status-badge">{activeOrder.status}</span>
        </div>

        <div className="profile-order-items">
          {activeOrder.items.map((item) => (
            <div key={item.name} className="profile-order-item-row">
              <span>{item.name} x{item.quantity}</span>
              <strong>{item.price}</strong>
            </div>
          ))}
        </div>

        <div className="profile-order-item-row profile-order-total">
          <span>Total</span>
          <strong>{activeOrder.total}</strong>
        </div>
      </div>

      <div className="profile-panel-card">
        <h3>Status Timeline</h3>
        <div className="profile-timeline-item profile-timeline-complete">
          <CheckCircle2 size={18} />
          <span>Preparing</span>
        </div>
        <div className="profile-timeline-item profile-timeline-complete">
          <CheckCircle2 size={18} />
          <span>Ready for Pickup</span>
        </div>
        <div className="profile-timeline-item">
          <Clock3 size={18} />
          <span>Collected</span>
        </div>
      </div>

      {activeOrder.status === "ready" && (
        <div className="profile-qr-card">
          <div className="profile-qr-box">
            <QRCodeSVG value={`ByteHive-Order-${activeOrder.id}`} size={170} />
          </div>
          <p>Show this QR code at the counter to collect your order.</p>
        </div>
      )}
    </>
  );

  const renderOrderHistoryView = () => (
    <>
      {renderBackButton()}
      <div className="profile-stack">
        {orderHistory.map((order) => (
          <div key={order.id} className="profile-panel-card">
            <div className="profile-order-item-row">
              <strong>{order.outlet}</strong>
              <strong>{order.total}</strong>
            </div>
            <p>{order.date}</p>
            <small>Order #{order.id}</small>
          </div>
        ))}
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
      <div
        className={`profile-hub-shell ${isMobile ? "profile-hub-shell-mobile" : "profile-hub-shell-desktop"}`}
        onClick={(event) => event.stopPropagation()}
      >
        {renderHeader()}
        <div className="profile-hub-content">{content}</div>
      </div>
    </div>
  );
}

export default ProfileHub;
