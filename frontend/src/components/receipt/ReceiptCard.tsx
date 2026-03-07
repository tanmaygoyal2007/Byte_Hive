import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Package, Clock, MapPin, Download, CheckCircle } from "lucide-react";
import "./ReceiptCard.css";

interface Item {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptCardProps {
  orderId: string;
  outletName: string;
  pickupLocation: string;
  estimatedTime: string;
  items: Item[];
  subtotal: number;
  taxes: number;
  total: number;
  onDownload: () => void;
}

const ReceiptCard: React.FC<ReceiptCardProps> = ({
  orderId,
  outletName,
  pickupLocation,
  estimatedTime,
  items,
  subtotal,
  taxes,
  total,
  onDownload,
}) => {
  return (
    <div className="receipt-page">
      <div className="receipt-container">

        {/* Success Header */}
        <div className="success-section">
          <div className="success-icon">
            <CheckCircle size={40} strokeWidth={2.5} />
          </div>

          <h1 className="page-title">Order Placed Successfully!</h1>
          <p className="page-subtitle">
            Your order has been received and is being prepared.
          </p>
        </div>

        {/* Receipt Card */}
        <div className="receipt-card" id="receipt-content">

          {/* Order Header */}
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

          </div>

          {/* Outlet */}
          <div className="outlet-section">
            <h3 className="outlet-name">{outletName}</h3>

            <p className="outlet-location">
              <MapPin size={16} />
              {pickupLocation}
            </p>
          </div>

          {/* QR Section */}
          <div className="qr-section">

            <div className="qr-container">
              <QRCodeSVG
                value={`ByteHive-Order-${orderId}`}
                size={180}
                level="H"
              />
            </div>

            <p className="qr-text">
              Show this QR code at the counter to collect your order
            </p>

          </div>

          {/* Items */}
          <div className="items-section">
            <h4 className="section-title">Items Ordered</h4>

            {items.map((item, index) => (
              <div key={index} className="item-row">

                <div className="item-left">
                  <div className="quantity-badge">
                    {item.quantity}x
                  </div>

                  <span className="item-name">
                    {item.name}
                  </span>
                </div>

                <span className="item-price">
                  ₹{item.price}
                </span>

              </div>
            ))}
          </div>

          {/* Price Section */}
          <div className="price-section">

            <div className="price-row">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="price-row">
              <span>Taxes & Fees</span>
              <span>₹{taxes}</span>
            </div>

            <div className="divider"></div>

            <div className="price-row total-row">
              <span>Total Amount</span>
              <span className="total-amount">₹{total}</span>
            </div>

          </div>
        </div>

        {/* Download */}
        <button className="button-outline" onClick={onDownload}>
          <Download size={18} />
          Download Order Receipt
        </button>

        {/* Action Buttons */}
        <div className="action-buttons">

          <button className="button-primary">
            Order More Food
          </button>

          <button className="button-outline">
            Back to Home
          </button>

        </div>

      </div>
    </div>
  );
};

export default ReceiptCard;