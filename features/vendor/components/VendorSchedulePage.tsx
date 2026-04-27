import { ArrowLeft, CalendarClock, Clock3, MessageSquareText, Play, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import {
  formatScheduledOrderLabel,
  getOrdersForOutlet,
  subscribeToOrders,
  updateOrderStatus,
  type ByteHiveOrder,
} from "@/features/orders/services/order-portal.service";
import { getVendorLocation, getVendorOutlet, isVendorSessionAuthorized } from "@/features/vendor/services/vendor-portal.service";
import "@/features/vendor/components/VendorPortal.css";

function isScheduledTimeReached(scheduledFor: string | null | undefined) {
  if (!scheduledFor) return false;
  const scheduledDate = new Date(scheduledFor);
  return scheduledDate.getTime() <= Date.now();
}

function VendorSchedulePage() {
  const navigate = useNavigate();
  const [outletName] = useState(() => getVendorOutlet() ?? "");
  const [orders, setOrders] = useState<ByteHiveOrder[]>([]);
  const [autoReleasedIds, setAutoReleasedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isVendorSessionAuthorized() || !outletName) {
      navigate("/vendor/unauthorized", { replace: true });
      return;
    }

    const sync = () => setOrders(getOrdersForOutlet(outletName));
    sync();
    return subscribeToOrders(sync);
  }, [navigate, outletName]);

  useEffect(() => {
    const interval = setInterval(() => {
      orders.forEach((order) => {
        if (
          order.status === "scheduled" &&
          order.fulfillmentType === "scheduled" &&
          isScheduledTimeReached(order.scheduledFor) &&
          !autoReleasedIds.has(order.id)
        ) {
          void updateOrderStatus(order.id, "preparing");
          setAutoReleasedIds((prev) => new Set([...prev, order.id]));
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [orders, autoReleasedIds]);

  const scheduledOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status === "scheduled")
        .sort((left, right) => (left.scheduledFor ?? "").localeCompare(right.scheduledFor ?? "")),
    [orders]
  );

  const handleStartPreparation = (orderId: string) => {
    void updateOrderStatus(orderId, "accepted");
  };

  return (
    <div className="vendor-page">
      <Navbar />
      <main className="vendor-main">
        <div className="vendor-shell vendor-stack">
          <Link to="/vendor/dashboard" className="vendor-back-link">
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>

          <section className="vendor-card vendor-schedule-hero">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <h1 className="vendor-page-title">Pre-Scheduled Orders</h1>
                <p>Orders are automatically released when their scheduled time arrives. You can also manually release them earlier.</p>
              </div>
              <div className="vendor-schedule-hero-meta">
                <span className="vendor-section-icon">
                  <CalendarClock size={24} />
                </span>
                <strong>{outletName}</strong>
                <span className="vendor-location">
                  <Store size={16} />
                  {getVendorLocation(outletName)}
                </span>
              </div>
            </div>
          </section>

          <section className="vendor-card">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <h2>Upcoming slots</h2>
                <p>{scheduledOrders.length} scheduled order(s)</p>
              </div>
            </div>

            {scheduledOrders.length === 0 ? (
              <div className="vendor-empty vendor-schedule-empty">
                <CalendarClock size={26} />
                <strong>No scheduled orders yet</strong>
                <p>When students reserve future pickup times, they will appear here.</p>
              </div>
            ) : (
              <div className="vendor-order-column">
                {scheduledOrders.map((order) => {
                  const isReady = isScheduledTimeReached(order.scheduledFor);
                  return (
                    <article key={order.id} className={`vendor-order-card vendor-schedule-card${isReady ? " vendor-schedule-card-ready" : ""}`}>
                      <div className="vendor-order-header">
                        <div>
                          <div className="vendor-order-id">{order.receiptNumber}</div>
                          <div className="vendor-order-meta">
                            <Clock3 size={15} />
                            <span>{formatScheduledOrderLabel(order.scheduledFor)}</span>
                            {isReady && <span className="vendor-schedule-ready-badge">Ready</span>}
                          </div>
                        </div>
                        <span className="vendor-pill">{isReady ? "Time Reached" : "Scheduled"}</span>
                      </div>

                      <div className="vendor-order-customer">{order.customerName} • {order.customerRole}</div>

                      <ul className="vendor-order-items">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.id}`}>
                            <span>{item.name} x {item.quantity}</span>
                            <strong>Rs {item.price * item.quantity}</strong>
                          </li>
                        ))}
                      </ul>

                      {order.vendorNotes && (
                        <div className="vendor-schedule-note">
                          <MessageSquareText size={16} />
                          <span>{order.vendorNotes}</span>
                        </div>
                      )}

                      <div className="vendor-order-footer">
                        <div className="vendor-order-total-copy">
                          <small>Total</small>
                          <strong>Rs {order.total}</strong>
                        </div>
                        {isReady ? (
                          <button type="button" className="vendor-button vendor-button-success" onClick={() => handleStartPreparation(order.id)}>
                            <Play size={16} />
                            Start Preparation
                          </button>
                        ) : (
                          <span className="vendor-waiting-label">
                            <Clock3 size={16} />
                            Auto-releases at scheduled time
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer variant="vendor" />
    </div>
  );
}

export default VendorSchedulePage;
