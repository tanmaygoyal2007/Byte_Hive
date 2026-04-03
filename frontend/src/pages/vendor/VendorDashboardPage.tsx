import { CheckCircle2, ChevronDown, ChevronUp, Clock3, MapPin, Package, QrCode, Settings, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import {
  getOrdersForOutlet,
  getOrdersSummaryTimestamp,
  subscribeToOrders,
  updateOrderStatus,
  type ByteHiveOrder,
} from "../../utils/orderPortal";
import { clearVendorSession, getVendorLocation, getVendorOutlet, getVendorOutletStatus, setVendorOutletStatus } from "../../utils/vendorPortal";
import "./VendorPortal.css";

function VendorDashboardPage() {
  const navigate = useNavigate();
  const [outletName, setOutletName] = useState("");
  const [isOutletOpen, setIsOutletOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orders, setOrders] = useState<ByteHiveOrder[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const outlet = getVendorOutlet();
    if (!outlet) {
      navigate("/vendor/login", { replace: true });
      return;
    }

    const sync = () => setOrders(getOrdersForOutlet(outlet).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setOutletName(outlet);
    setIsOutletOpen(getVendorOutletStatus(outlet));
    sync();

    const timer = window.setTimeout(() => setIsLoadingOrders(false), 600);
    const unsubscribe = subscribeToOrders(sync);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const syncViewport = () => setIsMobile(window.innerWidth < 900);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "collected"), [orders]);
  const completedOrders = useMemo(() => orders.filter((order) => order.status === "collected"), [orders]);

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((current) => (current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]));
  };

  const handleStatusToggle = () => {
    const next = !isOutletOpen;
    setIsOutletOpen(next);
    setVendorOutletStatus(next, outletName);
  };

  const handleOrderAction = (orderId: string, currentStatus: ByteHiveOrder["status"]) => {
    if (currentStatus === "preparing") updateOrderStatus(orderId, "accepted");
    if (currentStatus === "accepted") updateOrderStatus(orderId, "ready");
  };

  const handleLogout = () => {
    clearVendorSession();
    navigate("/vendor/login");
  };

  const getActionMeta = (status: ByteHiveOrder["status"]) => {
    if (status === "preparing") return { label: "Accept Order", className: "vendor-order-action vendor-order-action-new", disabled: false };
    if (status === "accepted") return { label: "Mark as Ready", className: "vendor-order-action vendor-order-action-accepted", disabled: false };
    if (status === "ready") return { label: "Await QR Verification", className: "vendor-order-action vendor-order-action-ready", disabled: true };
    if (status === "handoff") return { label: "Await Student Confirmation", className: "vendor-order-action vendor-order-action-ready", disabled: true };
    return { label: "Completed", className: "vendor-order-action vendor-order-action-ready", disabled: true };
  };

  const getBadgeMeta = (status: ByteHiveOrder["status"]) => {
    if (status === "preparing") return { className: "vendor-status-badge vendor-status-new", label: "New Order" };
    if (status === "accepted") return { className: "vendor-status-badge vendor-status-accepted", label: "Accepted" };
    if (status === "ready") return { className: "vendor-status-badge vendor-status-ready", label: "Ready" };
    if (status === "handoff") return { className: "vendor-status-badge vendor-status-ready", label: "Handoff Confirming" };
    return { className: "vendor-status-badge vendor-status-collected", label: "Collected" };
  };

  const renderSkeletons = () => (
    <div className="vendor-order-column">
      {[1, 2, 3].map((item) => (
        <div key={item} className="vendor-skeleton-card">
          <span className="vendor-skeleton-line vendor-skeleton-line-short" />
          <span className="vendor-skeleton-line vendor-skeleton-line-medium" />
          <span className="vendor-skeleton-line vendor-skeleton-line-long" />
        </div>
      ))}
    </div>
  );

  const renderEmpty = (title: string, copy: string) => (
    <div className="vendor-empty">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );

  const renderOrderCard = (order: ByteHiveOrder, collapsible = false) => {
    const isExpanded = expandedOrders.includes(order.id);
    const action = getActionMeta(order.status);
    const badge = getBadgeMeta(order.status);

    return (
      <div key={order.id} className="vendor-order-card">
        <div className="vendor-order-header">
          <div>
            <div className="vendor-order-meta">
              <span className="vendor-order-id">#{order.id}</span>
              <span className={badge.className}>{badge.label}</span>
            </div>
            <p className="vendor-order-customer">{order.customerName}</p>
          </div>

          <div className="vendor-order-meta">
            <Clock3 size={16} />
            <span>{getOrdersSummaryTimestamp(order.updatedAt)}</span>
            {collapsible && (
              <button type="button" className="vendor-icon-button" onClick={() => toggleExpanded(order.id)} aria-expanded={isExpanded}>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            )}
          </div>
        </div>

        {(!collapsible || isExpanded) && (
          <>
            <ul className="vendor-order-items">
              {order.items.map((item) => (
                <li key={`${order.id}-${item.id}`}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>Rs {item.price * item.quantity}</span>
                </li>
              ))}
            </ul>

            <div className="vendor-order-footer">
              <div className="vendor-order-total-copy">
                <small>Total</small>
                <strong className="vendor-order-total">Rs {order.total}</strong>
              </div>
              {order.status !== "collected" && (
                <button
                  type="button"
                  className={action.className}
                  disabled={action.disabled}
                  onClick={() => handleOrderAction(order.id, order.status)}
                >
                  {action.label}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="vendor-page">
      <Navbar />
      <main className="vendor-main">
        <div className="vendor-shell vendor-stack">
          <section className="vendor-card">
            <div className="vendor-topline">
              <div className="vendor-section-title">
                <div className="vendor-outlet-meta">
                  <span className="vendor-section-icon"><Store size={22} /></span>
                  <div>
                    <h1 className="vendor-page-title">{outletName || "Vendor Dashboard"}</h1>
                    <p className="vendor-location"><MapPin size={16} /> {getVendorLocation(outletName)}</p>
                  </div>
                </div>
              </div>

              <div className="vendor-tabs">
                <button type="button" className="vendor-status-toggle" onClick={handleStatusToggle}>
                  <span className={`vendor-status-dot ${isOutletOpen ? "vendor-status-open" : ""}`} />
                  {isOutletOpen ? "Open" : "Closed"}
                </button>
                <Link to="/vendor/menu" className="vendor-button-secondary"><Settings size={18} />Manage Menu</Link>
                <button type="button" className="vendor-button-ghost" onClick={handleLogout}>Logout</button>
              </div>
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <div className="vendor-outlet-meta">
                  <span className="vendor-section-icon"><QrCode size={22} /></span>
                  <div>
                    <h1 className="vendor-page-title" style={{ fontSize: "1.5rem" }}>QR Verification</h1>
                    <p>Scan customer QR codes to verify pickups and complete ready orders.</p>
                  </div>
                </div>
              </div>

              <Link to="/vendor/qr-scanner" className="vendor-button"><QrCode size={18} />Open QR Scanner</Link>
            </div>
          </section>

          {isMobile && (
            <div className="vendor-mobile-tabbar">
              <button type="button" className={`vendor-tab ${activeTab === "active" ? "vendor-tab-active" : ""}`} onClick={() => setActiveTab("active")}>
                <Package size={16} /> Active <span className="vendor-badge">{activeOrders.length}</span>
              </button>
              <button type="button" className={`vendor-tab ${activeTab === "completed" ? "vendor-tab-active" : ""}`} onClick={() => setActiveTab("completed")}>
                <CheckCircle2 size={16} /> Completed
              </button>
            </div>
          )}

          {isMobile ? (
            <section className="vendor-card">
              <div className="vendor-section-title">
                <h1 className="vendor-page-title" style={{ fontSize: "1.5rem" }}>{activeTab === "active" ? "Active Orders" : "Completed Orders"}</h1>
              </div>
              {isLoadingOrders
                ? renderSkeletons()
                : activeTab === "active"
                  ? activeOrders.length
                    ? <div className="vendor-order-column">{activeOrders.map((order) => renderOrderCard(order, true))}</div>
                    : renderEmpty("No active orders", "New orders will appear here.")
                  : completedOrders.length
                    ? <div className="vendor-order-column">{completedOrders.map((order) => renderOrderCard(order, true))}</div>
                    : renderEmpty("No completed orders", "Completed orders will show here.")}
            </section>
          ) : (
            <div className="vendor-orders-grid">
              <section className="vendor-card">
                <div className="vendor-card-header">
                  <div className="vendor-section-title">
                    <h1 className="vendor-page-title" style={{ fontSize: "1.5rem" }}>Active Orders</h1>
                    <p>Track new, accepted, and ready orders in one place.</p>
                  </div>
                  <span className="vendor-badge">{activeOrders.length}</span>
                </div>
                {isLoadingOrders ? renderSkeletons() : activeOrders.length ? <div className="vendor-order-column">{activeOrders.map((order) => renderOrderCard(order))}</div> : renderEmpty("No active orders", "New orders will appear here.")}
              </section>

              <section className="vendor-card">
                <div className="vendor-card-header">
                  <div className="vendor-section-title">
                    <h1 className="vendor-page-title" style={{ fontSize: "1.5rem" }}>Completed Orders</h1>
                    <p>Collected orders move here automatically after verification.</p>
                  </div>
                </div>
                {isLoadingOrders ? renderSkeletons() : completedOrders.length ? <div className="vendor-order-column">{completedOrders.map((order) => renderOrderCard(order))}</div> : renderEmpty("No completed orders", "Completed orders will show here.")}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default VendorDashboardPage;
