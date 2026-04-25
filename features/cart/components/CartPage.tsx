import Navbar from "@/components/components/layout/Navbar";
import Footer from "@/components/components/layout/Footer";
import PaymentButton from "@/features/cart/components/PaymentButton";
import "@/features/cart/components/CartPage.css";
import "@/features/cart/components/OutletSwitchConfirm.css";
import { useContext, useState, useEffect } from "react";
import { Link } from "@/components/lib/router";
import CartContext from "@/features/cart/store/cart.store";
import { resolveMenuImageUrl } from "@/features/menu/services/menu-image.service";
import { AlertTriangle, CalendarClock, Clock3, ChevronDown, ChevronUp } from "lucide-react";
import { getMenuItemsForOutlet, getOutletMetaById, subscribeToMenu, type MenuCatalogItem } from "@/features/orders/services/order-portal.service";
import { getVendorClosureLabel, getVendorOutletStatus } from "@/features/vendor/services/vendor-portal.service";

type MenuUpdateNotice = {
  signature: string;
  lines: string[];
  itemChanges: Record<string, string[]>;
};

const EMPTY_CART_ITEMS: Array<{
  id: string;
  name: string;
  price: number;
  image?: string;
  canteenId?: string;
  quantity: number;
  isAvailable?: boolean;
}> = [];

function getDefaultScheduleValue() {
  const next = new Date(Date.now() + 90 * 60_000);
  next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
  return `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
}

function formatTimeDisplay(timeValue: string) {
  if (!timeValue) return "--:--";
  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function buildCartMenuUpdate(items: Array<{
  id: string;
  name: string;
  price: number;
  image?: string;
  canteenId?: string;
  quantity: number;
  isAvailable?: boolean;
}>, latestMenuItems: MenuCatalogItem[]) {
  const latestById = new Map(latestMenuItems.map((item) => [item.id, item]));
  const lines: string[] = [];
  const itemChanges: Record<string, string[]> = {};

  const addItemChange = (itemId: string, message: string) => {
    lines.push(message);
    itemChanges[itemId] = [...(itemChanges[itemId] ?? []), message];
  };

  const nextItems = items.map((item) => {
    const latest = latestById.get(item.id);

    if (!latest) {
      if (item.isAvailable !== false) {
        addItemChange(item.id, `${item.name} is no longer available on the menu.`);
      }

      return {
        ...item,
        isAvailable: false,
      };
    }

    const nextItem = {
      ...item,
      name: latest.name,
      price: latest.price,
      image: latest.image ? resolveMenuImageUrl(latest.image) : item.image,
      canteenId: latest.canteenId,
      isAvailable: latest.isAvailable !== false,
    };

    if (item.name !== latest.name) {
      addItemChange(item.id, `${item.name} is now listed as ${latest.name}.`);
    }

    if (item.price !== latest.price) {
      addItemChange(item.id, `${latest.name} price was updated to Rs ${latest.price.toFixed(2)}.`);
    }

    if ((item.isAvailable ?? true) !== (latest.isAvailable !== false) && latest.isAvailable === false) {
      addItemChange(item.id, `${latest.name} is currently unavailable.`);
    }

    return nextItem;
  });

  if (lines.length === 0) {
    return null;
  }

  return {
    nextItems,
    notice: {
      signature: JSON.stringify(
        nextItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          isAvailable: item.isAvailable !== false,
        }))
      ),
      lines,
      itemChanges,
    },
  };
}

function mergeMenuUpdateNotices(current: MenuUpdateNotice | null, incoming: MenuUpdateNotice) {
  if (!current) {
    return incoming;
  }

  const mergedLines = [...current.lines];
  incoming.lines.forEach((line) => {
    if (!mergedLines.includes(line)) {
      mergedLines.push(line);
    }
  });

  const mergedItemChanges: Record<string, string[]> = { ...current.itemChanges };
  Object.entries(incoming.itemChanges).forEach(([itemId, changes]) => {
    const existing = mergedItemChanges[itemId] ?? [];
    changes.forEach((change) => {
      if (!existing.includes(change)) {
        existing.push(change);
      }
    });
    mergedItemChanges[itemId] = existing;
  });

  return {
    signature: incoming.signature,
    lines: mergedLines,
    itemChanges: mergedItemChanges,
  };
}

function buildVendorUpdateSections(
  items: Array<{
    id: string;
    name: string;
    isAvailable?: boolean;
  }>,
  summary: MenuUpdateNotice | null
) {
  if (!summary) return [];

  return items
    .filter((item) => (summary.itemChanges[item.id] ?? []).length > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      isUnavailable: item.isAvailable === false,
      changes: summary.itemChanges[item.id] ?? [],
    }));
}

function CartPage() {
  const ctx = useContext(CartContext);
  const [ready, setReady] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(getDefaultScheduleValue);
  const [scheduleNote, setScheduleNote] = useState("");
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [menuUpdateNotice, setMenuUpdateNotice] = useState<MenuUpdateNotice | null>(null);
  const [menuUpdateSummary, setMenuUpdateSummary] = useState<MenuUpdateNotice | null>(null);
  const [showVendorUpdateDetails, setShowVendorUpdateDetails] = useState(false);
  const [acknowledgedMenuSignature, setAcknowledgedMenuSignature] = useState<string | null>(null);

  useEffect(() => {
    setReady(true);
  }, []);

  const items = ctx?.state.items ?? EMPTY_CART_ITEMS;
  const sourceCanteen = ctx?.state.sourceCanteen;
  const subtotal = ctx?.total() ?? 0;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const outletMeta = items[0]?.canteenId ? getOutletMetaById(items[0].canteenId) : null;
  const isOutletOpen = outletMeta ? getVendorOutletStatus(outletMeta.name) : true;
  const closureLabel = outletMeta ? getVendorClosureLabel(outletMeta.name) : null;
  const hasUnavailableItems = items.some((item) => item.isAvailable === false);
  const vendorUpdateSections = buildVendorUpdateSections(items, menuUpdateSummary);

  useEffect(() => {
    if (!items.length) {
      setMenuUpdateNotice(null);
      setMenuUpdateSummary(null);
      setShowVendorUpdateDetails(false);
      setAcknowledgedMenuSignature(null);
      return;
    }

    const outletId = items[0]?.canteenId;
    if (!outletId) return;

    const syncCartWithMenu = () => {
      const latestMenuItems = getMenuItemsForOutlet(outletId);
      const update = buildCartMenuUpdate(items, latestMenuItems);

      if (!update) {
        return;
      }

      const nextSerialized = JSON.stringify(update.nextItems);
      const currentSerialized = JSON.stringify(items);

      if (nextSerialized !== currentSerialized) {
        ctx?.replaceItems(update.nextItems, sourceCanteen);
      }

      if (acknowledgedMenuSignature !== update.notice.signature) {
        setMenuUpdateNotice((current) => mergeMenuUpdateNotices(current, update.notice));
      }
    };

    syncCartWithMenu();
    return subscribeToMenu(syncCartWithMenu);
  }, [items, ctx, sourceCanteen, acknowledgedMenuSignature]);

  if (!ready) {
    return (
      <div className="cart-page">
        <Navbar />
        <main className="cart-main">
          <div className="cart-header">
            <div className="cart-hero">
              <div className="cart-hero-copy">
                <span className="cart-eyebrow">Checkout Desk</span>
                <h1 className="cart-title">Loading...</h1>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!ctx) return null;

  const { increment, decrement, removeItem, clear } = ctx;

  return (
    <div className={`cart-page${menuUpdateNotice ? " has-menu-update" : ""}`}>
      <Navbar />

      <main className="cart-main">
        <div className="cart-header">
          <div className="cart-hero">
            <div className="cart-hero-copy">
              <span className="cart-eyebrow">Checkout Desk</span>
              <h1 className="cart-title">Review your order before payment</h1>
              <p className="cart-subtitle">
                {items.length === 0
                  ? "Your cart is empty"
                  : `${totalItems} item(s) from ${outletMeta?.name ?? "your selected outlet"} are ready for checkout.`}
              </p>
            </div>

            <div className="cart-hero-badges" aria-hidden={items.length === 0}>
              <div className="cart-badge">
                <span className="cart-badge-label">Pickup</span>
                <strong>{outletMeta?.estimatedTime ?? "10-15 min"}</strong>
              </div>
              <div className="cart-badge">
                <span className="cart-badge-label">Outlet</span>
                <strong>{outletMeta?.location ?? "Campus food court"}</strong>
              </div>
            </div>
          </div>
          {!isOutletOpen && outletMeta && (
            <div className="payment-error" style={{ marginTop: "1rem" }}>
              <span>{closureLabel ?? `${outletMeta.name} is temporarily closed for checkout. You can keep items in cart and try again once it reopens.`}</span>
            </div>
          )}
          {hasUnavailableItems && !menuUpdateSummary && (
            <div className="payment-error" style={{ marginTop: "1rem" }}>
              <span>One or more cart items are unavailable. Remove them before checkout.</span>
            </div>
          )}
          {menuUpdateSummary && (
            <div className="cart-update-summary" role="status" aria-live="polite">
              <div className="cart-update-summary-head">
                <div className="cart-update-summary-icon" aria-hidden="true">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <strong>Cart updates from vendor</strong>
                  <p>Review these changes before checkout.</p>
                </div>
              </div>
              <button
                type="button"
                className="cart-update-toggle-btn"
                onClick={() => setShowVendorUpdateDetails((current) => !current)}
              >
                <div className="cart-update-toggle-content">
                  <span className="cart-update-toggle-label">
                    {showVendorUpdateDetails ? "Hide changes" : "Show changes"}
                  </span>
                </div>
                {showVendorUpdateDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {showVendorUpdateDetails && (
                <div className="cart-update-summary-list">
                  {vendorUpdateSections.map((section) => (
                    <div key={section.id} className="cart-update-summary-item">
                      <div className="cart-update-summary-item-head">
                        <strong>{section.name}</strong>
                        {section.isUnavailable && <span className="cart-update-summary-badge">Unavailable</span>}
                      </div>
                      <div className="cart-update-summary-item-lines">
                        {section.changes.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="cart-toolbar">
            <Link to="/canteens" className="cart-toolbar-btn cart-toolbar-btn--ghost">
              Back to Canteen
            </Link>
            <button
              type="button"
              className="cart-toolbar-btn cart-toolbar-btn--danger"
              onClick={clear}
              disabled={items.length === 0}
            >
              Clear Cart
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">BH</div>
            <h2>Nothing here yet!</h2>
            <p>Browse our canteens and add some delicious food.</p>
            <Link to="/canteens" className="cart-browse-btn">Browse Canteens</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-items-panel">
              <div className="cart-section-head">
                <div>
                  <span className="cart-section-label">Items in cart</span>
                  <h2>Your selections</h2>
                </div>
                <span className="cart-section-meta">{items.length} unique item(s)</span>
              </div>

              <div className="cart-items" role="list" aria-label="Cart items">
                {[...items].sort((a, b) => a.name.localeCompare(b.name)).map((item, index) => {
                  return (
                  <article
                    key={item.id}
                    className="cart-item"
                    role="listitem"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    {item.image ? (
                      <img
                        src={resolveMenuImageUrl(item.image)}
                        alt={item.name}
                        className="cart-item-img"
                      />
                    ) : (
                      <div className="cart-item-img cart-item-img--placeholder" aria-hidden="true">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="cart-item-info">
                      <div className="cart-item-copy">
                        <h3 className="cart-item-name">{item.name}</h3>
                        <p className="cart-item-meta">
                          {outletMeta?.name ?? "Campus outlet"} • ₹{item.price.toFixed(2)} each
                        </p>
                        {item.isAvailable === false && (
                          <p className="cart-item-alert">Currently unavailable. Remove this item to continue.</p>
                        )}
                      </div>

                      <div className="cart-item-footer">
                        <div className="cart-item-controls">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => decrement(item.id)}
                            aria-label={`Decrease quantity for ${item.name}`}
                          >
                            −
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => increment(item.id)}
                            aria-label={`Increase quantity for ${item.name}`}
                            disabled={item.isAvailable === false}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="cart-item-remove"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="cart-item-subtotal">
                      <span className="cart-item-subtotal-label">Item total</span>
                      <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
                    </div>
                  </article>
                  );
                })}
              </div>
            </section>

            <div className="cart-summary">
              <div className="summary-chip">Secure checkout</div>
              <h2 className="summary-title">Order Summary</h2>
              <p className="summary-subtitle">
                Payment gateway stays active. Review the amount and continue to Razorpay.
              </p>

              <div className="summary-lines">
                <div className="summary-line">
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>
                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-line">
                  <span>Taxes & fees</span>
                  <span>Included</span>
                </div>
              </div>

              <div className="summary-mini-list">
                {[...items].sort((a, b) => a.name.localeCompare(b.name)).map((item) => (
                  <div key={item.id} className="summary-mini-row">
                    <span>{item.name} x {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="summary-divider" />

              <div className="summary-total">
                <span>Total payable</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-taxes">
                <span>{outletMeta?.name ?? "Selected outlet"}</span>
                <span>{outletMeta?.estimatedTime ?? "10-15 minutes"}</span>
              </div>

              <button
                type="button"
                className="schedule-toggle-btn"
                onClick={() => setShowSchedulePanel(!showSchedulePanel)}
              >
                <div className="schedule-toggle-content">
                  <CalendarClock size={20} aria-hidden="true" />
                  <div className="schedule-toggle-text">
                    <span className="summary-chip summary-chip-schedule">Pre-Schedule</span>
                    <span className="schedule-toggle-label">
                      {showSchedulePanel ? "Hide order time" : "Reserve an order time"}
                    </span>
                  </div>
                </div>
                {showSchedulePanel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showSchedulePanel && (
              <div className="schedule-panel">
                <div className="schedule-panel-head">
                  <div>
                    <h3>Reserve an order time</h3>
                  </div>
                  <CalendarClock size={20} aria-hidden="true" />
                </div>
                <p className="schedule-panel-copy">
                  Choose a future time and we will send the order to the vendor schedule board. Your payment will be collected now.
                </p>

                <label className="schedule-label" htmlFor="schedule-at">
                  Order time
                </label>
                <div className="schedule-input-wrap">
                  <Clock3 size={18} aria-hidden="true" />
                  <input
                    id="schedule-at"
                    className="schedule-input"
                    type="time"
                    value={scheduleAt}
                    onChange={(event) => setScheduleAt(event.target.value)}
                  />
                </div>

                <label className="schedule-label" htmlFor="schedule-note">
                  Note for vendor
                </label>
                <textarea
                  id="schedule-note"
                  className="schedule-textarea"
                  value={scheduleNote}
                  onChange={(event) => setScheduleNote(event.target.value)}
                  placeholder="Optional: less spicy, pack separately, pickup after class..."
                  rows={3}
                />

                <div className="schedule-preview">
                  <strong>Today, {formatTimeDisplay(scheduleAt)}</strong>
                  <span>Payment will be collected now.</span>
                </div>

                {!scheduleConfirmed ? (
                  <button
                    type="button"
                    className="summary-secondary-btn schedule-confirm-btn"
                    onClick={() => setScheduleConfirmed(true)}
                  >
                    Confirm Schedule
                  </button>
                ) : (
                  <div className="schedule-confirmed-actions">
                    <span className="schedule-confirmed-label">
                      <CalendarClock size={16} />
                      Scheduled for {formatTimeDisplay(scheduleAt)}
                    </span>
                    <button
                      type="button"
                      className="schedule-remove-btn"
                      onClick={() => setScheduleConfirmed(false)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              )}

              <PaymentButton
                items={items}
                total={subtotal}
                canteenId={items[0]?.canteenId ?? "default"}
                scheduledTime={showSchedulePanel && scheduleConfirmed ? scheduleAt : null}
                scheduledNote={scheduleNote}
                isExternallyBlocked={hasUnavailableItems}
                blockedMessage="Remove unavailable items to continue"
                onPaymentStart={() => console.log("Payment started")}
                onPaymentSuccess={(paymentId, orderId) =>
                  console.log("Paid:", paymentId, orderId)
                }
                onPaymentFailure={(err) => console.error("Payment failed:", err)}
              />

              <Link to={sourceCanteen ? `/canteens/${sourceCanteen}` : "/canteens"} className="summary-secondary-btn">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </main>

      {menuUpdateNotice && (
        <div className="outlet-switch-overlay" role="dialog" aria-modal="true" aria-labelledby="cart-menu-update-title">
          <div className="outlet-switch-modal menu-update-modal" onClick={(event) => event.stopPropagation()}>
            <div className="outlet-switch-icon menu-update-icon">
              <AlertTriangle size={32} />
            </div>
            <h3 id="cart-menu-update-title">Cart Items Updated</h3>
            <p>The vendor changed one or more items in your cart. Please review these updates before continuing.</p>
            <div className="cart-menu-update-list" role="status" aria-live="polite">
              {menuUpdateNotice.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="outlet-switch-actions">
              <button
                type="button"
                className="outlet-switch-confirm"
                onClick={() => {
                  setMenuUpdateSummary((current) => mergeMenuUpdateNotices(current, menuUpdateNotice));
                  setAcknowledgedMenuSignature(menuUpdateNotice.signature);
                  setMenuUpdateNotice(null);
                }}
              >
                Review Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default CartPage;
