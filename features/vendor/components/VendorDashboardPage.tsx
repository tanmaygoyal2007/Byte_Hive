import { CheckCircle2, ChevronDown, ChevronUp, Clock3, MapPin, Package, QrCode, Settings, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import useSecondClock from "@/components/hooks/useSecondClock";
import {
  getLivePrepMinutes,
  getOrderCountdownState,
  getOrderDelayCopy,
  getOrderEtaLabel,
  getOrdersForOutlet,
  getOrdersSummaryTimestamp,
  subscribeToOrders,
  updateOrderTiming,
  updateOrderStatus,
  type ByteHiveOrder,
} from "@/features/orders/services/order-portal.service";
import {
  clearVendorSession,
  clearVendorTemporaryClosure,
  getVendorClosureLabel,
  getVendorLocation,
  getVendorOutlet,
  getVendorOutletStatusInfo,
  setVendorManualClosure,
  setVendorScheduledClosure,
  subscribeToVendorStatus,
  type VendorOutletStatusInfo,
} from "@/features/vendor/services/vendor-portal.service";

function VendorDashboardPage() {
  const navigate = useNavigate();
  const [showCompletedOrders, setShowCompletedOrders] = useState(true);
  const [outletName] = useState(() => getVendorOutlet() ?? "");
  const [outletStatusInfo, setOutletStatusInfo] = useState<VendorOutletStatusInfo>(() => getVendorOutletStatusInfo(getVendorOutlet() ?? ""));
  const [outletClosureLabel, setOutletClosureLabel] = useState<string | null>(() => getVendorClosureLabel(getVendorOutlet() ?? ""));
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orders, setOrders] = useState<ByteHiveOrder[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const now = useSecondClock();

  useEffect(() => {
    const outlet = getVendorOutlet();
    if (!outlet) {
      navigate("/vendor/login", { replace: true });
      return;
    }

    const sync = () => setOrders(getOrdersForOutlet(outlet).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
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

  useEffect(() => {
    const syncOutletStatus = () => {
      setOutletStatusInfo(getVendorOutletStatusInfo(outletName));
      setOutletClosureLabel(getVendorClosureLabel(outletName));
    };

    syncOutletStatus();
    const unsubscribe = subscribeToVendorStatus(syncOutletStatus);
    const interval = window.setInterval(syncOutletStatus, 30000);

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [outletName]);

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "collected"), [orders]);
  const completedOrders = useMemo(() => orders.filter((order) => order.status === "collected"), [orders]);

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((current) => (current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]));
  };

  const handleCloseOutlet = () => {
    const timeValue = window.prompt(
      "Enter reopening time in 24-hour HH:MM format. Leave blank to keep the outlet closed until you reopen it manually.",
      "21:00"
    );

    if (timeValue === null) return;

    const trimmedTime = timeValue.trim();
    const reason = window.prompt(
      "Optional notice for students",
      trimmedTime ? `Closed until ${trimmedTime}.` : "Closed until reopened manually."
    );

    if (!trimmedTime) {
      setVendorManualClosure(outletName, reason);
      return;
    }

    const match = trimmedTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      window.alert("Please enter time as HH:MM, for example 21:00.");
      return;
    }

    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      window.alert("Please enter a valid 24-hour time.");
      return;
    }

    const reopenAt = new Date();
    reopenAt.setSeconds(0, 0);
    reopenAt.setHours(hours, minutes, 0, 0);
    if (reopenAt.getTime() <= Date.now()) {
      reopenAt.setDate(reopenAt.getDate() + 1);
    }

    setVendorScheduledClosure(reopenAt.toISOString(), outletName, reason);
  };

  const handleReopenOutlet = () => {
    clearVendorTemporaryClosure(outletName);
  };

  const handleOrderAction = (orderId: string, currentStatus: ByteHiveOrder["status"]) => {
    if (currentStatus === "preparing") updateOrderStatus(orderId, "accepted");
    if (currentStatus === "accepted") updateOrderStatus(orderId, "ready");
  };

  const handleAddPrepTime = (order: ByteHiveOrder, minutesToAdd: number) => {
    updateOrderTiming(order.id, {
      prepMinutes: getLivePrepMinutes(order) + minutesToAdd,
    });
  };

  const handleReducePrepTime = (order: ByteHiveOrder, minutesToRemove: number) => {
    updateOrderTiming(order.id, {
      prepMinutes: Math.max(0, getLivePrepMinutes(order) - minutesToRemove),
    });
  };

  const handleCustomPrepTime = (order: ByteHiveOrder) => {
    const enteredValue = window.prompt("Set preparation time in minutes", String(getLivePrepMinutes(order)));
    if (enteredValue === null) return;

    const parsedMinutes = Number.parseInt(enteredValue.trim(), 10);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) {
      window.alert("Please enter a valid number of minutes.");
      return;
    }

    updateOrderTiming(order.id, {
      prepMinutes: parsedMinutes,
    });
  };

  const handleResetTiming = (order: ByteHiveOrder) => {
    updateOrderTiming(order.id, {
      resetToBase: true,
      delayState: "on-time",
      delayMessage: null,
    });
  };

  const handleDelayToggle = (order: ByteHiveOrder) => {
    if (order.delayState === "delayed") {
      updateOrderTiming(order.id, {
        delayState: "on-time",
        delayMessage: null,
      });
      return;
    }

    const delayNote = window.prompt(
      "Add a short delay note for the student",
      order.delayMessage ?? "Sorry, your order will be late."
    );

    if (delayNote === null) return;

    updateOrderTiming(order.id, {
      delayState: "delayed",
      delayMessage: delayNote.trim() || "Sorry, your order will be late.",
    });
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
    const etaLabel = getOrderEtaLabel(order);
    const delayCopy = getOrderDelayCopy(order);
    const canAdjustTiming = order.status !== "ready" && order.status !== "handoff" && order.status !== "collected";
    const countdown = getOrderCountdownState(order, now);

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

            <div className="vendor-order-insights">
              <div className={`vendor-order-insight-card ${countdown.isDelayed ? "vendor-order-insight-card-delayed" : ""}`}>
                <small>Pickup ETA</small>
                <strong>{etaLabel}</strong>
                {countdown.isActive && (
                  <span className={`vendor-order-timer ${countdown.isDelayed ? "vendor-order-timer-delayed" : ""}`}>
                    {countdown.isDelayed ? `Paused at ${countdown.clockLabel}` : `${countdown.clockLabel} remaining`}
                  </span>
                )}
              </div>
              <div className="vendor-order-insight-card">
                <small>Pickup Point</small>
                <strong>{order.pickupLocation}</strong>
              </div>
            </div>

            {delayCopy && (
              <div className="vendor-order-delay-banner">
                <strong>Delay notice shared</strong>
                <p>{delayCopy}</p>
              </div>
            )}

            {canAdjustTiming && (
              <div className="vendor-timing-panel">
                <div className="vendor-timing-header">
                  <div>
                    <strong>Preparation controls</strong>
                    <p>Adjust the ETA shown to the student and ByteBot.</p>
                  </div>
                  {order.vendorTimingUpdatedAt && <small>Updated {getOrdersSummaryTimestamp(order.vendorTimingUpdatedAt)}</small>}
                </div>

                <div className="vendor-timing-actions">
                  {[1, 5, 10, 15].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className="vendor-time-chip"
                      onClick={() => handleAddPrepTime(order, minutes)}
                    >
                      +{minutes} min
                    </button>
                  ))}
                  <button type="button" className="vendor-time-chip" onClick={() => handleCustomPrepTime(order)}>
                    Custom
                  </button>
                </div>

                <div className="vendor-timing-actions vendor-timing-actions-secondary">
                  {[1, 5, 10, 15].map((minutes) => (
                    <button
                      key={`minus-${minutes}`}
                      type="button"
                      className="vendor-time-chip vendor-time-chip-reduce"
                      onClick={() => handleReducePrepTime(order, minutes)}
                    >
                      -{minutes} min
                    </button>
                  ))}
                </div>

                <div className="vendor-timing-secondary-actions">
                  <button type="button" className="vendor-button-secondary" onClick={() => handleResetTiming(order)}>
                    Remove Time Changes
                  </button>
                  <button
                    type="button"
                    className={order.delayState === "delayed" ? "vendor-button vendor-delay-active" : "vendor-button-secondary"}
                    onClick={() => handleDelayToggle(order)}
                  >
                    {order.delayState === "delayed" ? "Clear Delay Notice" : "Mark Order Delayed"}
                  </button>
                </div>
              </div>
            )}

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
                <div className={`vendor-status-toggle ${outletStatusInfo.isOpen ? "" : "vendor-status-toggle-closed"}`}>
                  <span className={`vendor-status-dot ${outletStatusInfo.isOpen ? "vendor-status-open" : "vendor-status-closed"}`} />
                  {outletStatusInfo.isOpen ? "Open" : "Closed"}
                </div>
                {!outletStatusInfo.isOpen ? (
                  <button type="button" className="vendor-button-secondary" onClick={handleReopenOutlet}>
                    Reopen Now
                  </button>
                ) : (
                  <button type="button" className="vendor-button-secondary" onClick={handleCloseOutlet}>
                    Close Outlet
                  </button>
                )}
                <Link to="/vendor/menu" className="vendor-button-secondary"><Settings size={18} />Manage Menu</Link>
                <button type="button" className="vendor-button-ghost" onClick={handleLogout}>Logout</button>
              </div>
            </div>
            {!outletStatusInfo.isOpen && (
              <div className="vendor-order-delay-banner" style={{ marginTop: 18 }}>
                <strong>{outletStatusInfo.isManuallyClosed ? "Outlet is manually closed" : "Scheduled closure active"}</strong>
                <p>{outletClosureLabel ?? "This outlet is currently closed for checkout."}</p>
              </div>
            )}
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

              <Link to="/vendor/qr" className="vendor-button"><QrCode size={18} />Open QR Scanner</Link>
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
                  <button
                    type="button"
                    className={`vendor-status-toggle ${showCompletedOrders ? "" : "vendor-status-toggle-muted"}`}
                    onClick={() => setShowCompletedOrders((value) => !value)}
                  >
                    {showCompletedOrders ? "Hide" : "Show"}
                  </button>
                </div>
                {!showCompletedOrders
                  ? renderEmpty("Completed orders hidden", "Tap Show to bring collected orders back into view.")
                  : isLoadingOrders
                    ? renderSkeletons()
                    : completedOrders.length
                      ? <div className="vendor-order-column">{completedOrders.map((order) => renderOrderCard(order))}</div>
                      : renderEmpty("No completed orders", "Completed orders will show here.")}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer variant="vendor" />
    </div>
  );
}

export default VendorDashboardPage;
