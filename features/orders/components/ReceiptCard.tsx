import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Package, Clock, MapPin, Download, CheckCircle } from "lucide-react";

interface Item {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptCardProps {
  orderId: string;
  qrValue?: string;
  pickupCode?: string;
  paymentId?: string;
  outletName: string;
  pickupLocation: string;
  estimatedTime: string;
  delayMessage?: string | null;
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
  paymentId,
  outletName,
  pickupLocation,
  estimatedTime,
  delayMessage,
  items,
  subtotal,
  taxes,
  total,
  onDownload,
  onOrderMore,
  onBackHome,
  downloadStatus = "idle",
}) => {
  return (
    <div className="receipt-page">
      <div className="receipt-container">
        <div className="success-section">
          <div className="success-icon">
            <CheckCircle size={40} strokeWidth={2.5} />
          </div>

          <h1 className="page-title">Order Placed Successfully!</h1>
          <p className="page-subtitle">
            Your order has been received and is being prepared.
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
                <span className="label">Estimated Pickup</span>
              </div>
              <span className="value">{estimatedTime}</span>
            </div>

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

          <div className="qr-section">
            <div className="qr-container">
              <QRCodeSVG
                value={qrValue || `ByteHive-Order-${orderId}`}
                size={180}
                level="H"
              />
            </div>

            <p className="qr-text">
              Show this QR code at the counter to collect your order.
            </p>
            {pickupCode && (
              <p className="qr-text">
                Pickup code: <strong>{pickupCode}</strong>
              </p>
            )}
          </div>

          <div className="items-section">
            <h4 className="section-title">Items Ordered</h4>

            {items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="item-row">
                <div className="item-left">
                  <div className="quantity-badge">{item.quantity}x</div>
                  <span className="item-name">{item.name}</span>
                </div>

                <span className="item-price">Rs {item.price}</span>
              </div>
            ))}
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
