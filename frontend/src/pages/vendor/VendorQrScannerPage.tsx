import { AlertCircle, ArrowLeft, Camera, CheckCircle2, QrCode, ScanLine, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import {
  getOrderById,
  getOrderForOutletByPickupCode,
  getOrdersForOutlet,
  getQrValueForOrder,
  subscribeToOrders,
  updateOrderStatus,
  validateQrPayload,
  type ByteHiveOrder,
} from "../../utils/orderPortal";
import { getVendorOutlet, getVendorOutletId } from "../../utils/vendorPortal";
import "./VendorPortal.css";

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (input: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorCtor;
};

type ScanState =
  | "scanning"
  | "success"
  | "invalid"
  | "already-collected"
  | "already-verified"
  | "wrong-outlet";

function VendorQrScannerPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [outletName, setOutletName] = useState("");
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [verifiedOrder, setVerifiedOrder] = useState<ByteHiveOrder | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [readyOrders, setReadyOrders] = useState<ByteHiveOrder[]>([]);
  const [scannerNotice, setScannerNotice] = useState("");
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "ready" | "unsupported" | "blocked">("idle");

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
        return outletOrders.find((order) => order.id === current.id) ?? null;
      });
    };

    setOutletName(outlet);
    syncOrders();
    return subscribeToOrders(syncOrders);
  }, [navigate]);

  useEffect(() => {
    if (scanState !== "scanning") {
      stopCamera();
      return;
    }

    void startCamera();
    return () => stopCamera();
  }, [scanState]);

  const latestReadyQr = useMemo(
    () => (readyOrders[0] ? getQrValueForOrder(readyOrders[0]) : ""),
    [readyOrders]
  );

  function stopCamera() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setCameraState("ready");

      const detectorCtor = (window as WindowWithBarcodeDetector).BarcodeDetector;
      if (!detectorCtor || !videoRef.current) {
        return;
      }

      const detector = new detectorCtor({ formats: ["qr_code"] });
      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

        try {
          const codes = await detector.detect(video);
          const rawValue = codes[0]?.rawValue?.trim();
          if (rawValue) {
            setScanInput(rawValue);
            handleVerify(rawValue);
          }
        } catch {
          // Ignore intermittent detector errors and keep the camera stream alive.
        }
      }, 1200);
    } catch {
      setCameraState("blocked");
    }
  }

  const handleVerify = (rawValue = scanInput) => {
    setScannerNotice("");

    const parsed = validateQrPayload(rawValue);
    const manualCode = rawValue.trim();
    const pickupCodeOrder = !parsed ? getOrderForOutletByPickupCode(outletName, manualCode) : null;

    if (!parsed && !pickupCodeOrder) {
      setVerifiedOrder(null);
      setScanState("invalid");
      return;
    }

    const order = pickupCodeOrder ?? getOrderById(parsed?.orderId ?? "");
    if (!order) {
      setVerifiedOrder(null);
      setScanState("invalid");
      return;
    }

    const vendorOutletId = getVendorOutletId(outletName);
    if (
      parsed &&
      parsed.outletId &&
      parsed.outletId !== vendorOutletId
    ) {
      setVerifiedOrder(order);
      setScanState("wrong-outlet");
      return;
    }

    if (order.outletName !== outletName || order.outletId !== vendorOutletId) {
      setVerifiedOrder(order);
      setScanState("wrong-outlet");
      return;
    }

    if (parsed?.qrToken && order.qrToken !== parsed.qrToken) {
      setVerifiedOrder(null);
      setScanState("invalid");
      return;
    }

    if (order.status === "collected") {
      setVerifiedOrder(order);
      setScanState("already-collected");
      return;
    }

    if (order.status === "handoff") {
      setVerifiedOrder(order);
      setScanState("already-verified");
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

  const handleMarkCollectedPrompt = () => {
    if (!verifiedOrder) return;

    const updatedOrder = updateOrderStatus(verifiedOrder.id, "handoff");
    setScannerNotice(
      updatedOrder
        ? `Pickup confirmed for ${updatedOrder.id}. The student portal has been asked to confirm collection.`
        : `Pickup confirmed for ${verifiedOrder.id}.`
    );
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
            {cameraState === "ready" ? (
              <video ref={videoRef} className="vendor-scanner-video" playsInline muted autoPlay />
            ) : (
              <div className="vendor-scanner-placeholder">
                <Camera size={40} />
                <p>
                  {cameraState === "starting"
                    ? "Opening camera..."
                    : cameraState === "blocked"
                      ? "Camera access is blocked. Paste the QR payload below."
                      : "Camera preview will appear here if the browser allows QR scanning."}
                </p>
              </div>
            )}
            <div className="vendor-scanner-focus" />
            <QrCode className="vendor-scanner-frame-icon" size={40} />
          </div>

          <div className="vendor-scanner-state">
            <span className="vendor-scan-state-icon"><ScanLine size={28} /></span>
            <h2>Ready to Verify</h2>
            <p>Scan the student QR in the camera box or enter the short pickup code, receipt number, or full QR payload below.</p>
          </div>

          <div className="vendor-field" style={{ width: "min(100%, 460px)" }}>
            <label htmlFor="vendor-qr-input">Pickup code, receipt number, or QR payload</label>
            <input
              id="vendor-qr-input"
              className="vendor-input"
              value={scanInput}
              onChange={(event) => setScanInput(event.target.value)}
              placeholder="0002 or PB-20260403-002"
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
                    <span>{order.customerName} | #{order.id} | Code {order.pickupCode}</span>
                    <button
                      type="button"
                      className="vendor-button-ghost"
                      onClick={() => {
                        const qrValue = getQrValueForOrder(order);
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
            <p>The outlet and QR token match. Review the order, then send the student pickup confirmation.</p>
          </div>

          <div className="vendor-verified-summary">
            <div className="vendor-verified-header">
              <strong>Order #{verifiedOrder.id}</strong>
              <span className="vendor-status-badge vendor-status-ready">Ready</span>
            </div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Customer</span><strong>{verifiedOrder.customerName}</strong></div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Outlet</span><strong>{verifiedOrder.outletName}</strong></div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Receipt Number</span><strong>{verifiedOrder.receiptNumber}</strong></div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Pickup Code</span><strong>{verifiedOrder.pickupCode}</strong></div>
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
            <button type="button" className="vendor-button" onClick={handleMarkCollectedPrompt}>Mark as Collected</button>
          </div>
        </div>
      );
    }

    const stateMap = {
      invalid: {
        icon: <XCircle size={28} />,
        title: "Invalid QR Code",
        copy: verifiedOrder?.status && verifiedOrder.status !== "ready"
          ? `This order is currently ${verifiedOrder.status}. QR pickup works only after the order is marked ready.`
          : "The QR code is not recognized. Ask the customer to show the QR from their ByteHive receipt or active order prompt.",
      },
      "already-collected": {
        icon: <AlertCircle size={28} />,
        title: "Order Already Collected",
        copy: "This order has already been marked as collected. If this seems wrong, please contact support.",
      },
      "already-verified": {
        icon: <AlertCircle size={28} />,
        title: "Awaiting Student Confirmation",
        copy: "This QR has already been verified at the counter. The student still needs to confirm that the order was picked up.",
      },
      "wrong-outlet": {
        icon: <AlertCircle size={28} />,
        title: "Wrong Outlet",
        copy: `This QR belongs to ${verifiedOrder?.outletName ?? "another outlet"}. Please redirect the customer to the correct counter.`,
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
