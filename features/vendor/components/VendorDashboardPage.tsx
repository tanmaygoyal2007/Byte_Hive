import { CheckCircle2, ChevronDown, ChevronUp, CircleHelp, Clock3, History, KeyRound, MapPin, Package, QrCode, Settings, Store, X } from "lucide-react";
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
  getVendorClosureNotice,
  clearVendorTemporaryClosure,
  getVendorClosureLabel,
  getVendorLocation,
  getVendorOutlet,
  getVendorOutletStatusInfo,
  isVendorSessionAuthorized,
  setVendorManualClosure,
  setVendorScheduledClosure,
  subscribeToVendorStatus,
  syncVendorStatusesFromServer,
  type VendorOutletStatusInfo,
} from "@/features/vendor/services/vendor-portal.service";
import { verifyVendorMasterKey } from "@/features/vendor/services/vendor.service";

function getDefaultClosureDate() {
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString().slice(0, 10);
}

function getDateInputValue(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function VendorDashboardPage() {
  const navigate = useNavigate();
  const [showCompletedWorkspace, setShowCompletedWorkspace] = useState(false);
  const [outletName] = useState(() => getVendorOutlet() ?? "");
  const [outletStatusInfo, setOutletStatusInfo] = useState<VendorOutletStatusInfo>(() => getVendorOutletStatusInfo(getVendorOutlet() ?? ""));
  const [outletClosureLabel, setOutletClosureLabel] = useState<string | null>(() => getVendorClosureLabel(getVendorOutlet() ?? ""));
  const [outletClosureNotice, setOutletClosureNotice] = useState<string | null>(() => getVendorClosureNotice(getVendorOutlet() ?? ""));
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orders, setOrders] = useState<ByteHiveOrder[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMenuKeyModal, setShowMenuKeyModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showClosureGuidance, setShowClosureGuidance] = useState(false);
  const [isEditingClosure, setIsEditingClosure] = useState(false);
  const [closureMode, setClosureMode] = useState<"custom" | "manual">("custom");
  const [closureDate, setClosureDate] = useState(() => getDefaultClosureDate());
  const [closureTime, setClosureTime] = useState("09:00");
  const [closureReasonInput, setClosureReasonInput] = useState("");
  const [closureError, setClosureError] = useState("");
  const [menuMasterKey, setMenuMasterKey] = useState("");
  const [menuKeyError, setMenuKeyError] = useState("");
  const [menuKeyVerified, setMenuKeyVerified] = useState(false);
  const [isVerifyingMenuKey, setIsVerifyingMenuKey] = useState(false);
  const now = useSecondClock();

  useEffect(() => {
    const outlet = getVendorOutlet();
    if (!isVendorSessionAuthorized() || !outlet) {
      navigate("/vendor/unauthorized", { replace: true });
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
      setOutletClosureNotice(getVendorClosureNotice(outletName));
    };

    syncOutletStatus();
    const unsubscribe = subscribeToVendorStatus(syncOutletStatus);
    const interval = window.setInterval(syncOutletStatus, 30000);

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [outletName]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "scheduled" && order.status !== "handoff" && order.status !== "collected"),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === "handoff" || order.status === "collected"),
    [orders]
  );
  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((current) => (current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]));
  };

  const prefillClosureForm = (mode: "create" | "edit") => {
    setIsEditingClosure(mode === "edit");
    setShowClosureGuidance(false);
    setClosureError("");

    const latestStatusInfo = getVendorOutletStatusInfo(outletName);
    const latestNotice = getVendorClosureNotice(outletName);

    if (mode === "edit" && !latestStatusInfo.isOpen) {
      if (latestStatusInfo.isManuallyClosed) {
        setClosureMode("manual");
      } else {
        setClosureMode("custom");
      }

      if (latestStatusInfo.closedUntil) {
        const reopenAt = new Date(latestStatusInfo.closedUntil);
        if (!Number.isNaN(reopenAt.getTime())) {
          setClosureDate(getDateInputValue(reopenAt));
          setClosureTime(
            `${String(reopenAt.getHours()).padStart(2, "0")}:${String(reopenAt.getMinutes()).padStart(2, "0")}`
          );
        }
      } else {
        setClosureDate(getDefaultClosureDate());
        setClosureTime("09:00");
      }

      setClosureReasonInput(latestNotice ?? "");
      setShowClosureModal(true);
      return;
    }

    setClosureMode("custom");
    setClosureDate(getDefaultClosureDate());
    setClosureTime("09:00");
    setClosureReasonInput("");
    setShowClosureModal(true);
  };

  const closeClosureModal = () => {
    setShowClosureModal(false);
    setShowClosureGuidance(false);
    setIsEditingClosure(false);
    setClosureMode("custom");
    setClosureDate(getDefaultClosureDate());
    setClosureTime("09:00");
    setClosureReasonInput("");
    setClosureError("");
  };

  const handleCloseOutlet = () => {
    prefillClosureForm("create");
  };

  const handleEditClosure = () => {
    void syncVendorStatusesFromServer(true).then(() => {
      setOutletStatusInfo(getVendorOutletStatusInfo(outletName));
      setOutletClosureLabel(getVendorClosureLabel(outletName));
      setOutletClosureNotice(getVendorClosureNotice(outletName));
      prefillClosureForm("edit");
    });
  };

  const handleSubmitClosure = async () => {
    const trimmedReason = closureReasonInput.trim();

    if (closureMode === "manual") {
      await setVendorManualClosure(outletName, trimmedReason || "Closed until reopened manually.");
      closeClosureModal();
      return;
    }

    if (!closureDate || !closureTime) {
      setClosureError("Please choose a reopening date and time.");
      return;
    }

    const reopenAt = new Date(`${closureDate}T${closureTime}:00`);
    if (Number.isNaN(reopenAt.getTime())) {
      setClosureError("Please choose a valid reopening date and time.");
      return;
    }

    if (reopenAt.getTime() <= Date.now()) {
      setClosureError("Reopening time must be in the future.");
      return;
    }

    await setVendorScheduledClosure(reopenAt.toISOString(), outletName, trimmedReason || null);
    closeClosureModal();
  };

  const handleReopenOutlet = async () => {
    await clearVendorTemporaryClosure(outletName);
  };

  const handleOrderAction = (orderId: string, currentStatus: ByteHiveOrder["status"]) => {
    if (currentStatus === "preparing" || currentStatus === "accepted") void updateOrderStatus(orderId, "ready");
    if (currentStatus === "ready" || currentStatus === "partially-collected") return;
    if (currentStatus === "handoff") void updateOrderStatus(orderId, "collected");
  };

  const handleAddPrepTime = (order: ByteHiveOrder, minutesToAdd: number) => {
    void updateOrderTiming(order.id, {
      prepMinutes: getLivePrepMinutes(order) + minutesToAdd,
    });
  };

  const handleReducePrepTime = (order: ByteHiveOrder, minutesToRemove: number) => {
    void updateOrderTiming(order.id, {
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

    void updateOrderTiming(order.id, {
      prepMinutes: parsedMinutes,
    });
  };

  const handleResetTiming = (order: ByteHiveOrder) => {
    void updateOrderTiming(order.id, {
      resetToBase: true,
      delayState: "on-time",
      delayMessage: null,
    });
  };

  const handleDelayToggle = (order: ByteHiveOrder) => {
    if (order.delayState === "delayed") {
      void updateOrderTiming(order.id, {
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

    void updateOrderTiming(order.id, {
      delayState: "delayed",
      delayMessage: delayNote.trim() || "Sorry, your order will be late.",
    });
  };

  const handleLogout = () => {
    clearVendorSession();
    navigate("/vendor/login");
  };

  const handleMenuAccess = async () => {
    if (menuKeyVerified) {
      navigate("/vendor/menu");
      return;
    }

    if (!menuMasterKey) return;

    setIsVerifyingMenuKey(true);
    setMenuKeyError("");

    try {
      const result = await verifyVendorMasterKey(outletName, menuMasterKey);
      if (result.success) {
        setMenuKeyVerified(true);
        navigate("/vendor/menu");
      } else {
        setMenuKeyError("Invalid master key.");
      }
    } catch (error) {
      setMenuKeyError(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setIsVerifyingMenuKey(false);
    }
  };

  const getActionMeta = (status: ByteHiveOrder["status"]) => {
    if (status === "preparing" || status === "accepted") return { label: "Ready", className: "vendor-order-action vendor-order-action-accepted", disabled: false };
    if (status === "ready") return { label: "Awaiting Scan", className: "vendor-order-action vendor-order-action-ready", disabled: true };
    if (status === "partially-collected") return { label: "Partially Collected", className: "vendor-order-action vendor-order-action-ready", disabled: true };
    if (status === "handoff") return { label: "Completed", className: "vendor-order-action vendor-order-action-ready", disabled: true };
    if (status === "collected") return { label: "Completed", className: "vendor-order-action vendor-order-action-ready", disabled: true };
    return { label: "Completed", className: "vendor-order-action vendor-order-action-ready", disabled: true };
  };

  const getBadgeMeta = (status: ByteHiveOrder["status"]) => {
    if (status === "preparing" || status === "accepted") return { className: "vendor-status-badge vendor-status-new", label: "New Order" };
    if (status === "ready") return { className: "vendor-status-badge vendor-status-ready", label: "Ready" };
    if (status === "partially-collected") return { className: "vendor-status-badge vendor-status-ready", label: "Partially Collected" };
    if (status === "handoff") return { className: "vendor-status-badge vendor-status-collected", label: "Completed" };
    if (status === "collected") return { className: "vendor-status-badge vendor-status-collected", label: "Collected" };
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
    const canAdjustTiming =
      order.status !== "ready" &&
      order.status !== "partially-collected" &&
      order.status !== "handoff" &&
      order.status !== "collected";
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
              {order.status !== "collected" && order.status !== "handoff" && (
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

              <div className="vendor-header-actions">
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
                  <button type="button" className="vendor-button-secondary" onClick={() => setShowMenuKeyModal(true)}>
                    <Settings size={18} />Manage Menu
                  </button>
                  <button type="button" className="vendor-button-ghost" onClick={handleLogout}>Logout</button>
                </div>
                <Link to="/vendor/history" className="vendor-history-fab" aria-label="Open order history and insights">
                  <History size={24} strokeWidth={2.25} />
                  <span className="vendor-history-fab-label">Order History & Insights</span>
                </Link>
              </div>
            </div>
            {!outletStatusInfo.isOpen && (
              <div className="vendor-order-delay-banner vendor-order-delay-banner-spaced">
                <strong>{outletStatusInfo.isManuallyClosed ? "Outlet is manually closed" : "Scheduled closure active"}</strong>
                <p>{outletClosureNotice ?? "This outlet is currently closed for checkout."}</p>
                {outletClosureLabel && <p>{outletClosureLabel}</p>}
                <div className="vendor-closure-banner-actions">
                  <button type="button" className="vendor-button-secondary" onClick={handleEditClosure}>
                    Edit Closure
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="vendor-card">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <div className="vendor-outlet-meta">
                  <span className="vendor-section-icon"><QrCode size={22} /></span>
                  <div>
                    <h1 className="vendor-page-title vendor-section-title-compact">QR Verification</h1>
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
                <h1 className="vendor-page-title vendor-section-title-compact">{activeTab === "active" ? "Active Orders" : "Completed Orders"}</h1>
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
            <section className={`vendor-orders-workspace ${showCompletedWorkspace ? "vendor-orders-workspace-split" : ""}`}>
              <div className="vendor-orders-workspace-toolbar">
                <div className="vendor-orders-workspace-copy">
                  <span className="vendor-pill">Worker View</span>
                  <p>Keep active tickets front and center, then reveal completed orders only when you need them.</p>
                </div>
                <button
                  type="button"
                  className={`vendor-orders-toggle ${showCompletedWorkspace ? "vendor-orders-toggle-active" : ""}`}
                  onClick={() => setShowCompletedWorkspace((value) => !value)}
                  aria-expanded={showCompletedWorkspace}
                  aria-controls="vendor-completed-orders-panel"
                >
                  <CheckCircle2 size={18} />
                  <span className="vendor-orders-toggle-label">
                    {showCompletedWorkspace ? "Focus Active Orders" : "Show Completed Orders"}
                  </span>
                </button>
              </div>

              <div className={`vendor-orders-grid ${showCompletedWorkspace ? "vendor-orders-grid-split" : "vendor-orders-grid-focus"}`}>
                <section className="vendor-card vendor-orders-panel vendor-orders-panel-active">
                <div className="vendor-card-header">
                  <div className="vendor-section-title">
                    <h1 className="vendor-page-title vendor-section-title-compact">Active Orders</h1>
                    <p>Track new, accepted, and ready orders in one place.</p>
                  </div>
                  <span className="vendor-badge">{activeOrders.length}</span>
                </div>
                {isLoadingOrders
                  ? renderSkeletons()
                  : activeOrders.length
                    ? (
                        <div
                          className={`vendor-order-column vendor-order-column-scroll vendor-order-column-scroll-active${
                            showCompletedWorkspace ? "" : " vendor-order-column-scroll-board"
                          }`}
                        >
                          {activeOrders.map((order) => renderOrderCard(order))}
                        </div>
                      )
                    : renderEmpty("No active orders", "New orders will appear here.")}
                </section>

                <section
                  id="vendor-completed-orders-panel"
                  className={`vendor-card vendor-orders-panel vendor-orders-panel-completed ${showCompletedWorkspace ? "vendor-orders-panel-visible" : "vendor-orders-panel-hidden"}`}
                  aria-hidden={!showCompletedWorkspace}
                >
                  <div className="vendor-card-header">
                    <div className="vendor-section-title">
                      <h1 className="vendor-page-title vendor-section-title-compact">Completed Orders</h1>
                      <p>Collected orders move here automatically after verification.</p>
                    </div>
                    <span className="vendor-badge">{completedOrders.length}</span>
                  </div>
                  {!showCompletedWorkspace
                    ? renderEmpty("Completed orders tucked away", "Use the completed-orders control when you want the split workspace.")
                  : isLoadingOrders
                    ? renderSkeletons()
                    : completedOrders.length
                      ? <div className="vendor-order-column-scroll">{completedOrders.map((order) => renderOrderCard(order))}</div>
                      : renderEmpty("No completed orders", "Completed orders will show here.")}
                </section>
              </div>
            </section>
          )}
        </div>
      </main>

      {showMenuKeyModal && (
        <>
          <div className="vendor-form-backdrop" onClick={() => { setShowMenuKeyModal(false); setMenuMasterKey(""); setMenuKeyError(""); setMenuKeyVerified(false); }} />
          <div className="vendor-form-wrap">
            <section className="vendor-form-panel" role="dialog" aria-modal="true" aria-label="Verify Master Key">
              <div className="vendor-form-header">
                <div>
                  <h2>Menu Management Access</h2>
                  <p className="vendor-muted">Enter the master key to access the Menu Management page.</p>
                </div>
                <button
                  type="button"
                  className="vendor-icon-button"
                  onClick={() => { setShowMenuKeyModal(false); setMenuMasterKey(""); setMenuKeyError(""); setMenuKeyVerified(false); }}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="vendor-form-body">
                <div className="vendor-field">
                  <label htmlFor="vendor-menu-master-key">Master Key</label>
                  <div className="vendor-password-field">
                    <div className="vendor-master-key-wrap">
                      <KeyRound size={18} className="vendor-master-key-icon" />
                      <input
                        id="vendor-menu-master-key"
                        type="password"
                        className="vendor-input vendor-input-master-key"
                        value={menuMasterKey}
                        onChange={(event) => { setMenuMasterKey(event.target.value); setMenuKeyError(""); }}
                        placeholder="Enter master key"
                      />
                    </div>
                  </div>
                  <p className="vendor-form-hint">Contact admin if you don't have the master key.</p>
                </div>
                {menuKeyError && <p className="vendor-form-hint vendor-form-error">{menuKeyError}</p>}
              </div>
              <div className="vendor-form-actions">
                <button
                  type="button"
                  className="vendor-button-ghost"
                  onClick={() => { setShowMenuKeyModal(false); setMenuMasterKey(""); setMenuKeyError(""); setMenuKeyVerified(false); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="vendor-button"
                  disabled={!menuMasterKey || isVerifyingMenuKey}
                  onClick={handleMenuAccess}
                >
                  {isVerifyingMenuKey ? "Verifying..." : "Verify & Access"}
                </button>
              </div>
            </section>
          </div>
        </>
      )}

      {showClosureModal && (
        <>
          <div className="vendor-form-backdrop" onClick={closeClosureModal} />
          <div className="vendor-form-wrap">
            <div className={`vendor-closure-layout ${showClosureGuidance ? "vendor-closure-layout-guidance-open" : ""}`}>
              {showClosureGuidance && (
                <aside className="vendor-closure-guidance-card">
                  <div className="vendor-closure-guidance-header">
                    <strong>Closure tips</strong>
                    <button
                      type="button"
                      className="vendor-icon-button"
                      onClick={() => setShowClosureGuidance(false)}
                      aria-label="Hide closure guidance"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <ul className="vendor-guidance-list vendor-guidance-list-spacious">
                    <li>Use a date and time for overnight closures, holidays, and stock refills.</li>
                    <li>Use manual reopen if the outlet should stay closed until staff decides to reopen it.</li>
                    <li>Add a short notice so students know whether to wait, return tomorrow, or try another outlet.</li>
                  </ul>
                </aside>
              )}

              <section className="vendor-form-panel" role="dialog" aria-modal="true" aria-label="Set outlet closure">
                <div className="vendor-form-header">
                  <div>
                    <h2>{isEditingClosure ? "Edit Closure" : "Close Outlet"}</h2>
                    <p className="vendor-muted">Choose how long this outlet should stay closed. This works for overnight, multi-day, or indefinite closures.</p>
                  </div>
                  <div className="vendor-form-header-actions">
                    <button
                      type="button"
                      className={`vendor-button-secondary vendor-closure-guidance-trigger ${showClosureGuidance ? "vendor-closure-guidance-trigger-active" : ""}`}
                      onClick={() => setShowClosureGuidance((value) => !value)}
                    >
                      <CircleHelp size={18} />
                      Guidance
                    </button>
                    <button
                      type="button"
                      className="vendor-icon-button"
                      onClick={closeClosureModal}
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="vendor-form-body">
                  <div className="vendor-closure-mode-grid">
                    <button
                      type="button"
                      className={`vendor-closure-mode-card ${closureMode === "custom" ? "vendor-closure-mode-card-active" : ""}`}
                      onClick={() => { setClosureMode("custom"); setClosureError(""); }}
                    >
                      <strong>Reopen on a date</strong>
                      <span>Best for overnight closures, holidays, or semester breaks.</span>
                    </button>
                    <button
                      type="button"
                      className={`vendor-closure-mode-card ${closureMode === "manual" ? "vendor-closure-mode-card-active" : ""}`}
                      onClick={() => { setClosureMode("manual"); setClosureError(""); }}
                    >
                      <strong>Manual reopen</strong>
                      <span>Keep the outlet closed until staff reopens it from the dashboard.</span>
                    </button>
                  </div>

                  {closureMode === "custom" && (
                    <div className="vendor-form-row">
                      <div className="vendor-field">
                        <label htmlFor="vendor-closure-date">Reopen date</label>
                        <input
                          id="vendor-closure-date"
                          type="date"
                          className="vendor-input"
                          value={closureDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(event) => { setClosureDate(event.target.value); setClosureError(""); }}
                        />
                      </div>
                      <div className="vendor-field">
                        <label htmlFor="vendor-closure-time">Reopen time</label>
                        <input
                          id="vendor-closure-time"
                          type="time"
                          className="vendor-input"
                          value={closureTime}
                          onChange={(event) => { setClosureTime(event.target.value); setClosureError(""); }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="vendor-field">
                    <label htmlFor="vendor-closure-reason">Notice</label>
                    <textarea
                      id="vendor-closure-reason"
                      className="vendor-textarea"
                      value={closureReasonInput}
                      onChange={(event) => setClosureReasonInput(event.target.value)}
                      placeholder={closureMode === "manual" ? "Closed for maintenance until further notice." : "Closed until Monday morning due to inventory restock."}
                    />
                    <p className="vendor-form-hint">Optional, but helpful for anyone checking the outlet before ordering.</p>
                  </div>

                  {closureError && <p className="vendor-form-hint vendor-form-error">{closureError}</p>}
                </div>

                <div className="vendor-form-actions">
                  <button type="button" className="vendor-button-ghost" onClick={closeClosureModal}>
                    Cancel
                  </button>
                  <button type="button" className="vendor-button" onClick={handleSubmitClosure}>
                    {isEditingClosure ? "Update Closure" : "Save Closure"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      <Footer variant="vendor" />
    </div>
  );
}

export default VendorDashboardPage;
