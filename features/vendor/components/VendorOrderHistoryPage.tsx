 "use client";

import { ArrowLeft, BarChart3, CalendarDays, MapPin, Search, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import {
  getOrdersForOutlet,
  subscribeToOrders,
  type ByteHiveOrder,
} from "@/features/orders/services/order-portal.service";
import {
  getVendorLocation,
  getVendorOutlet,
} from "@/features/vendor/services/vendor-portal.service";
import "@/features/vendor/components/VendorPortal.css";

function getDateInputValue(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDateKeyFromIso(isoDate: string) {
  return getDateInputValue(new Date(isoDate));
}

function getWeekStart(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatCurrency(amount: number) {
  return `Rs ${Math.round(amount * 100) / 100}`;
}

function VendorOrderHistoryPage() {
  const navigate = useNavigate();
  const [outletName, setOutletName] = useState(() => getVendorOutlet() ?? "");
  const [orders, setOrders] = useState<ByteHiveOrder[]>([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(() => getDateInputValue());
  const [orderSearch, setOrderSearch] = useState("");

  useEffect(() => {
    const outlet = getVendorOutlet();
    if (!outlet) {
      navigate("/vendor/unauthorized", { replace: true });
      return;
    }

    setOutletName(outlet);
    const sync = () => setOrders(getOrdersForOutlet(outlet).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    sync();
    return subscribeToOrders(sync);
  }, [navigate]);

  const historyReferenceDate = useMemo(() => new Date(`${selectedHistoryDate}T00:00:00`), [selectedHistoryDate]);
  const selectedDayOrders = useMemo(
    () =>
      [...orders]
        .filter((order) => getDateKeyFromIso(order.createdAt) === selectedHistoryDate)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders, selectedHistoryDate]
  );

  const historyMetrics = useMemo(() => {
    const weekStart = getWeekStart(historyReferenceDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const month = historyReferenceDate.getMonth();
    const year = historyReferenceDate.getFullYear();

    const weekOrders = orders.filter((order) => {
      const created = new Date(order.createdAt);
      return created >= weekStart && created < weekEnd;
    });
    const monthOrders = orders.filter((order) => {
      const created = new Date(order.createdAt);
      return created.getFullYear() === year && created.getMonth() === month;
    });
    const yearOrders = orders.filter((order) => new Date(order.createdAt).getFullYear() === year);
    const totalRevenue = (source: ByteHiveOrder[]) => source.reduce((sum, order) => sum + order.total, 0);

    return {
      dayCount: selectedDayOrders.length,
      weekCount: weekOrders.length,
      monthCount: monthOrders.length,
      yearCount: yearOrders.length,
      dayRevenue: totalRevenue(selectedDayOrders),
      weekRevenue: totalRevenue(weekOrders),
      monthRevenue: totalRevenue(monthOrders),
      yearRevenue: totalRevenue(yearOrders),
    };
  }, [historyReferenceDate, orders, selectedDayOrders]);

  const filteredDayOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return selectedDayOrders;

    return selectedDayOrders.filter((order) => order.id.toLowerCase().includes(query));
  }, [orderSearch, selectedDayOrders]);

  const renderEmpty = (title: string, copy: string) => (
    <div className="vendor-empty">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );

  const getBadgeMeta = (status: ByteHiveOrder["status"]) => {
    if (status === "preparing" || status === "accepted") return { className: "vendor-status-badge vendor-status-new", label: "Active" };
    if (status === "ready") return { className: "vendor-status-badge vendor-status-ready", label: "Ready" };
    if (status === "partially-collected") return { className: "vendor-status-badge vendor-status-ready", label: "Partially Collected" };
    if (status === "handoff") return { className: "vendor-status-badge vendor-status-collected", label: "Completed" };
    if (status === "collected") return { className: "vendor-status-badge vendor-status-collected", label: "Collected" };
    return { className: "vendor-status-badge vendor-status-collected", label: "Collected" };
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

          <section className="vendor-card vendor-guidance-hero">
            <div className="vendor-guidance-header">
              <div className="vendor-guidance-title-section">
                <span className="vendor-guidance-badge">
                  <BarChart3 size={16} />
                  Vendor Analytics
                </span>
                <h1 className="vendor-page-title">Order History & Insights</h1>
                <p>Review one business day at a time, then compare that selected date against the same week, month, and year window.</p>
              </div>
              <div className="vendor-guidance-meta">
                <span className="vendor-guidance-meta-icon">
                  <Store size={28} />
                </span>
                <strong>{outletName || "Vendor Outlet"}</strong>
                <span className="vendor-guidance-location">
                  <MapPin size={16} />
                  {getVendorLocation(outletName)}
                </span>
              </div>
            </div>
          </section>

          <section className="vendor-card vendor-history-page-panel">
            <div className="vendor-card-header vendor-history-header">
              <div className="vendor-section-title">
                <h2>Choose a date</h2>
                <p>Use the calendar to load every order placed on that day for this outlet.</p>
              </div>

              <label className="vendor-history-date-field" htmlFor="vendor-history-date-page">
                <CalendarDays size={18} />
                <span>History date</span>
                <input
                  id="vendor-history-date-page"
                  type="date"
                  className="vendor-input vendor-history-date-input"
                  value={selectedHistoryDate}
                  max={getDateInputValue()}
                  onChange={(event) => setSelectedHistoryDate(event.target.value || getDateInputValue())}
                />
              </label>
            </div>

            <div className="vendor-history-metrics">
              <article className="vendor-history-metric">
                <small>Selected Day</small>
                <strong>{historyMetrics.dayCount}</strong>
                <span>{formatCurrency(historyMetrics.dayRevenue)} revenue</span>
              </article>
              <article className="vendor-history-metric">
                <small>Week Total</small>
                <strong>{historyMetrics.weekCount}</strong>
                <span>{formatCurrency(historyMetrics.weekRevenue)} revenue</span>
              </article>
              <article className="vendor-history-metric">
                <small>Month Total</small>
                <strong>{historyMetrics.monthCount}</strong>
                <span>{formatCurrency(historyMetrics.monthRevenue)} revenue</span>
              </article>
              <article className="vendor-history-metric">
                <small>Year Total</small>
                <strong>{historyMetrics.yearCount}</strong>
                <span>{formatCurrency(historyMetrics.yearRevenue)} revenue</span>
              </article>
            </div>

            <div className="vendor-history-list-wrap">
              <div className="vendor-history-list-header">
                <div>
                  <h2>{historyReferenceDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</h2>
                  <p>
                    {historyMetrics.dayCount === 0
                      ? "No orders were placed on this date."
                      : `${historyMetrics.dayCount} order${historyMetrics.dayCount === 1 ? "" : "s"} found for this date.`}
                  </p>
                </div>
                <label className="vendor-history-search" htmlFor="vendor-history-search">
                  <Search size={16} />
                  <input
                    id="vendor-history-search"
                    type="search"
                    className="vendor-input vendor-history-search-input"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Find by order ID"
                  />
                </label>
              </div>

              {selectedDayOrders.length === 0 ? (
                renderEmpty("No orders on this date", "Pick another date to review this outlet's earlier order flow.")
              ) : filteredDayOrders.length === 0 ? (
                renderEmpty("No matching order ID", "Try a different order ID from the selected day.")
              ) : (
                <div className="vendor-history-list">
                  {filteredDayOrders.map((order) => {
                    const badge = getBadgeMeta(order.status);
                    return (
                      <article key={`history-${order.id}`} className="vendor-history-item">
                        <div className="vendor-history-item-top">
                          <div>
                            <div className="vendor-order-meta">
                              <span className="vendor-order-id">#{order.id}</span>
                              <span className={badge.className}>{badge.label}</span>
                            </div>
                            <strong className="vendor-history-customer">{order.customerName}</strong>
                          </div>
                          <div className="vendor-history-item-side">
                            <strong>{formatCurrency(order.total)}</strong>
                            <span>{new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                          </div>
                        </div>
                        <div className="vendor-history-item-bottom">
                          <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                          <span>{order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer variant="vendor" />
    </div>
  );
}

export default VendorOrderHistoryPage;
