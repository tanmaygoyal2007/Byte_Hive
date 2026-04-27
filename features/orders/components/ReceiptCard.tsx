import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Package, Clock, MapPin, Download, CheckCircle } from "lucide-react";

interface Item {
  name: string;
  quantity: number;
  price: number;
  pickupPoint?: "counter" | "vendor_stall";
}

interface PickupQrSection {
  id: "counter" | "vendor_stall";
  pickupPoint: "counter" | "vendor_stall";
  title: string;
  description: string;
  qrValue?: string;
  pickupCode?: string;
  isQrExpired?: boolean;
}

interface ReceiptCardProps {
  orderId: string;
  qrValue?: string;
  pickupCode?: string;
  isQrExpired?: boolean;
  orderPlacedAt?: string;
  downloadedAt?: string;
  paymentId?: string;
  fulfillmentType?: "instant" | "scheduled";
  scheduledFor?: string | null;
  outletName: string;
  pickupLocation: string;
  estimatedTime: string;
  delayMessage?: string | null;
  pickupQrSections?: PickupQrSection[];
  items: Item[];
  subtotal: number;
  taxes: number;
  total: number;
  onDownload: () => void;
  onOrderMore: () => void;
  onBackHome: () => void;
  downloadStatus?: "idle" | "downloading" | "failed";
}

const ReceiptCard: React.FC<ReceiptCardProps> = ({
  orderId,
  qrValue,
  pickupCode,
  isQrExpired = false,
  orderPlacedAt,
  downloadedAt,
  paymentId,
  fulfillmentType = "instant",
  outletName,
  pickupLocation,
  estimatedTime,
  delayMessage,
  pickupQrSections,
  items,
  subtotal,
  taxes,
  total,
  onDownload,
  onOrderMore,
  onBackHome,
  downloadStatus = "idle",
}) => {
  const hasSplitPickup = items.some((item) => item.pickupPoint);
  const counterItems = items.filter((item) => item.pickupPoint !== "vendor_stall");
  const vendorStallItems = items.filter((item) => item.pickupPoint === "vendor_stall");
  const resolvedPickupQrSections =
    pickupQrSections && pickupQrSections.length > 0
      ? pickupQrSections
      : (qrValue || pickupCode || isQrExpired)
        ? [
            {
              id: "counter" as const,
              pickupPoint: "counter" as const,
              title: "Collect at Counter",
              description: isQrExpired
                ? "This order has already been completed, so its pickup QR is no longer shown."
                : "Show this QR code at the counter to collect your order.",
              qrValue,
              pickupCode,
              isQrExpired,
            },
          ]
        : [];
  const pickupQrSectionsByPoint = new Map(
    resolvedPickupQrSections.map((section) => [section.pickupPoint, section])
  );
  const hasVisiblePickupQr = (section?: PickupQrSection) => !!section && !section.isQrExpired && !!section.qrValue;

  const renderItemRows = (rows: Item[]) =>
    rows.map((item, index) => (
      <div key={`${item.name}-${index}`} className="item-row">
        <div className="item-left">
          <div className="quantity-badge">{item.quantity}x</div>
          <span className="item-name">{item.name}</span>
        </div>

        <span className="item-price">Rs {item.price}</span>
      </div>
    ));

  const renderPickupQrCard = (section: PickupQrSection, compact = false) => (
    <div className={`receipt-pickup-qr-card ${compact ? "receipt-pickup-qr-card-compact" : ""}`}>
      {hasVisiblePickupQr(section) ? (
        <div className="qr-container">
          <QRCodeSVG
            value={section.qrValue!}
            size={compact ? 146 : 180}
            level="H"
          />
        </div>
      ) : null}

      <div className="receipt-pickup-qr-copy">
        <strong>{section.title}</strong>
        {hasVisiblePickupQr(section) && <p className="qr-text">{section.description}</p>}
        {hasVisiblePickupQr(section) && section.pickupCode && (
          <p className="qr-text">
            Pickup code: <strong>{section.pickupCode}</strong>
          </p>
        )}
      </div>
    </div>
  );
  const isScheduledOrder = fulfillmentType === "scheduled";

  return (
    <div className="receipt-page">
      <div className="receipt-container">
        <div className="success-section">
          <div className="success-icon">
            <CheckCircle size={40} strokeWidth={2.5} />
          </div>

          <h1 className="page-title">{isScheduledOrder ? "Order Scheduled Successfully!" : "Order Placed Successfully!"}</h1>
          <p className="page-subtitle">
            {isScheduledOrder
              ? "Your future pickup slot has been reserved and shared with the vendor."
              : "Your order has been received and is being prepared."}
          </p>
        </div>

        <div className="receipt-card" id="receipt-content">
          <div className="order-header">
            <div className="order-info">
              <div className="label-row">
                <Package size={16} />
                <span className="label">Order ID</span>
              </div>
              <span className="value">{orderId}</span>
            </div>

            <div className="order-info">
              <div className="label-row">
                <Clock size={16} />
                <span className="label">{isScheduledOrder ? "Scheduled Pickup" : "Estimated Pickup"}</span>
              </div>
              <span className="value">{estimatedTime}</span>
            </div>

            {orderPlacedAt && (
              <div className="order-info">
                <div className="label-row">
                  <Clock size={16} />
                  <span className="label">Order Date & Time</span>
                </div>
                <span className="value">{orderPlacedAt}</span>
              </div>
            )}

            {paymentId && (
              <div className="order-info">
                <div className="label-row">
                  <Package size={16} />
                  <span className="label">Payment ID</span>
                </div>
                <span className="value">{paymentId}</span>
              </div>
            )}
          </div>

          <div className="outlet-section">
            <h3 className="outlet-name">{outletName}</h3>

            <p className="outlet-location">
              <MapPin size={16} />
              {pickupLocation}
            </p>
            {delayMessage && <p className="receipt-delay-note">{delayMessage}</p>}
          </div>

          {!hasSplitPickup && resolvedPickupQrSections[0] && hasVisiblePickupQr(resolvedPickupQrSections[0]) && (
            <div className="qr-section">
              {renderPickupQrCard({
                ...resolvedPickupQrSections[0],
                description: isScheduledOrder
                  ? "Show this QR code at the counter during your scheduled slot."
                  : resolvedPickupQrSections[0].description,
              })}
            </div>
          )}

          <div className="items-section">
            <h4 className="section-title">Items Ordered</h4>
            {!hasSplitPickup && renderItemRows(items)}
            {hasSplitPickup && (
              <div className="receipt-pickup-groups">
                {counterItems.length > 0 && (
                  <div className="receipt-pickup-group">
                    <h5 className="receipt-pickup-heading">Collect at Counter</h5>
                    {hasVisiblePickupQr(pickupQrSectionsByPoint.get("counter")) &&
                      renderPickupQrCard(pickupQrSectionsByPoint.get("counter")!, true)}
                    {renderItemRows(counterItems)}
                  </div>
                )}
                {vendorStallItems.length > 0 && (
                  <div className="receipt-pickup-group receipt-pickup-group-stall">
                    <h5 className="receipt-pickup-heading">Collect at Vendor Stall</h5>
                    {hasVisiblePickupQr(pickupQrSectionsByPoint.get("vendor_stall")) &&
                      renderPickupQrCard(pickupQrSectionsByPoint.get("vendor_stall")!, true)}
                    {renderItemRows(vendorStallItems)}
                    {hasVisiblePickupQr(pickupQrSectionsByPoint.get("vendor_stall")) && (
                      <p className="receipt-pickup-note">
                        Stall items are prepared separately. Please walk to the vendor stall area and show this receipt there.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="price-section">
            <div className="price-row">
              <span>Subtotal</span>
              <span>Rs {subtotal}</span>
            </div>

            <div className="price-row">
              <span>Taxes & Fees</span>
              <span>Rs {taxes}</span>
            </div>

            <div className="divider" />

            <div className="price-row total-row">
              <span>Total Amount</span>
              <span className="total-amount">Rs {total}</span>
            </div>
          </div>

          {downloadedAt && (
            <div className="receipt-download-meta">
              <span>Downloaded on</span>
              <strong>{downloadedAt}</strong>
            </div>
          )}
        </div>

        <button type="button" className="button-outline receipt-download" onClick={onDownload}>
          <Download size={18} />
          {downloadStatus === "downloading" ? "Preparing Receipt..." : "Download Order Receipt"}
        </button>

        <div className="action-buttons">
          <button type="button" className="button-primary" onClick={onOrderMore}>
            Order More Food
          </button>

          <button type="button" className="button-outline" onClick={onBackHome}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptCard;
