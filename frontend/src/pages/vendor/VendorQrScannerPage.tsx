import { AlertCircle, ArrowLeft, CheckCircle2, QrCode, ScanLine, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import {
  getOrderById,
  getOrdersForOutlet,
  getQrValueForOrder,
  subscribeToOrders,
  updateOrderStatus,
  validateQrPayload,
  type ByteHiveOrder,
} from "../../utils/orderPortal";
import { getVendorOutlet } from "../../utils/vendorPortal";
import "./VendorPortal.css";

type ScanState = "scanning" | "success" | "invalid" | "already-collected" | "wrong-outlet";

function VendorQrScannerPage() {
  const navigate = useNavigate();
  const [outletName, setOutletName] = useState("");
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [verifiedOrder, setVerifiedOrder] = useState<ByteHiveOrder | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [readyOrders, setReadyOrders] = useState<ByteHiveOrder[]>([]);
  const [scannerNotice, setScannerNotice] = useState("");

  useEffect(() => {
    const outlet = getVendorOutlet();
    if (!outlet) {
      navigate("/vendor/login", { replace: true });
      return;
    }

    const syncOrders = () => {
      const outletOrders = getOrdersForOutlet(outlet).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setReadyOrders(outletOrders.filter((order) => order.status === "ready"));
      setVerifiedOrder((current) => {
        if (!current) return current;
        return outletOrders.find((order) => order.id === current.id) ?? current;
      });
    };

    setOutletName(outlet);
    syncOrders();
    return subscribeToOrders(syncOrders);
  }, [navigate]);

  const latestReadyQr = useMemo(() => (readyOrders[0] ? getQrValueForOrder(readyOrders[0].id) : ""), [readyOrders]);

  const handleVerify = (rawValue = scanInput) => {
    setScannerNotice("");

    const orderId = validateQrPayload(rawValue);
    if (!orderId) {
      setVerifiedOrder(null);
      setScanState("invalid");
      return;
    }

    const order = getOrderById(orderId);
    if (!order) {
      setVerifiedOrder(null);
      setScanState("invalid");
      return;
    }

    if (order.outletName !== outletName) {
      setVerifiedOrder(order);
      setScanState("wrong-outlet");
      return;
    }

    if (order.status === "collected") {
      setVerifiedOrder(order);
      setScanState("already-collected");
      return;
    }

    if (order.status !== "ready") {
      setVerifiedOrder(order);
      setScanState("invalid");
      return;
    }

    setVerifiedOrder(order);
    setScanState("success");
  };

  const handleMarkCollected = () => {
    if (!verifiedOrder) return;

    updateOrderStatus(verifiedOrder.id, "collected");
    setScannerNotice(`Order ${verifiedOrder.id} has been marked as collected.`);
    setVerifiedOrder(null);
    setScanInput("");
    setScanState("scanning");
  };

  const resetScanner = () => {
    setVerifiedOrder(null);
    setScanInput("");
    setScanState("scanning");
    setScannerNotice("");
  };

  const renderState = () => {
    if (scanState === "scanning") {
      return (
        <div className="vendor-scanner-shell">
          <div className="vendor-scanner-frame">
            <div className="vendor-scanner-focus" />
            <QrCode className="vendor-scanner-frame-icon" size={40} />
          </div>

          <div className="vendor-scanner-state">
            <span className="vendor-scan-state-icon"><ScanLine size={28} /></span>
            <h2>Ready to Verify</h2>
            <p>Paste the QR payload or order code shown in the user portal receipt to verify the pickup.</p>
          </div>

          <div className="vendor-field" style={{ width: "min(100%, 460px)" }}>
            <label htmlFor="vendor-qr-input">QR payload</label>
            <input
              id="vendor-qr-input"
              className="vendor-input"
              value={scanInput}
              onChange={(event) => setScanInput(event.target.value)}
              placeholder="ByteHive-Order-BH-20260403-01"
            />
          </div>

          <div className="vendor-scanner-actions" style={{ width: "min(100%, 460px)" }}>
            <button type="button" className="vendor-button" onClick={() => handleVerify()} disabled={!scanInput.trim()}>
              Verify QR
            </button>
            {latestReadyQr && (
              <button
                type="button"
                className="vendor-button-secondary"
                onClick={() => {
                  setScanInput(latestReadyQr);
                  handleVerify(latestReadyQr);
                }}
              >
                Use Latest Ready Order
              </button>
            )}
          </div>

          {!!readyOrders.length && (
            <div className="vendor-verified-summary" style={{ width: "min(100%, 460px)" }}>
              <div className="vendor-verified-header">
                <strong>Ready Orders Queue</strong>
                <span className="vendor-badge">{readyOrders.length}</span>
              </div>
              <ul className="vendor-order-items">
                {readyOrders.slice(0, 4).map((order) => (
                  <li key={order.id}>
                    <span>{order.customerName} | #{order.id}</span>
                    <button
                      type="button"
                      className="vendor-button-ghost"
                      onClick={() => {
                        const qrValue = getQrValueForOrder(order.id);
                        setScanInput(qrValue);
                        handleVerify(qrValue);
                      }}
                    >
                      Verify
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (scanState === "success" && verifiedOrder) {
      return (
        <div className="vendor-scanner-shell">
          <div className="vendor-scanner-state">
            <span className="vendor-scan-state-icon"><CheckCircle2 size={28} /></span>
            <h2>Order Verified</h2>
            <p>Please review the order details below before marking it as collected.</p>
          </div>

          <div className="vendor-verified-summary">
            <div className="vendor-verified-header">
              <strong>Order #{verifiedOrder.id}</strong>
              <span className="vendor-status-badge vendor-status-ready">Ready</span>
            </div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Customer</span><strong>{verifiedOrder.customerName}</strong></div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Outlet</span><strong>{verifiedOrder.outletName}</strong></div>
            <ul className="vendor-order-items">
              {verifiedOrder.items.map((item) => (
                <li key={`${verifiedOrder.id}-${item.id}`}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>Rs {item.price * item.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Total Amount</span><strong>Rs {verifiedOrder.total}</strong></div>
          </div>

          <div className="vendor-scanner-actions">
            <button type="button" className="vendor-button" onClick={handleMarkCollected}>Mark as Collected</button>
            <button type="button" className="vendor-button-ghost" onClick={resetScanner}>Scan Another Order</button>
          </div>
        </div>
      );
    }

    const stateMap = {
      invalid: {
        icon: <XCircle size={28} />,
        title: "Invalid QR Code",
        copy: verifiedOrder?.status && verifiedOrder.status !== "ready"
          ? `This order is currently ${verifiedOrder.status}. QR pickup works only when the order is ready.`
          : "The QR code is not recognized. Ask the customer to show the QR from their ByteHive receipt.",
      },
      "already-collected": {
        icon: <AlertCircle size={28} />,
        title: "Order Already Collected",
        copy: "This order has already been marked as collected. If this seems wrong, please contact support.",
      },
      "wrong-outlet": {
        icon: <AlertCircle size={28} />,
        title: "Wrong Outlet",
        copy: `This order belongs to ${verifiedOrder?.outletName ?? "another outlet"}. Please redirect the customer to the correct counter.`,
      },
    } as const;

    const content = stateMap[scanState as Exclude<ScanState, "scanning" | "success">];
    return (
      <div className="vendor-scanner-shell">
        <div className="vendor-scanner-state">
          <span className="vendor-scan-state-icon">{content.icon}</span>
          <h2>{content.title}</h2>
          <p>{content.copy}</p>
        </div>
        <button type="button" className="vendor-button" onClick={resetScanner}>Try Again</button>
      </div>
    );
  };

  return (
    <div className="vendor-page">
      <Navbar />
      <main className="vendor-main">
        <div className="vendor-shell vendor-stack">
          <Link to="/vendor/dashboard" className="vendor-back-link"><ArrowLeft size={18} /> Back to Dashboard</Link>
          <section className="vendor-card vendor-scanner-card">
            <div className="vendor-card-header">
              <div className="vendor-section-title">
                <h1 className="vendor-page-title">QR Scanner</h1>
                <p>{outletName ? `Verifying pickups for ${outletName}.` : "Verify order pickups instantly."}</p>
              </div>
              <span className="vendor-pill">Live Verification</span>
            </div>
            {scannerNotice && <p className="vendor-form-hint">{scannerNotice}</p>}
            {renderState()}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default VendorQrScannerPage;
