import { AlertCircle, ArrowLeft, Camera, CameraOff, CheckCircle2, ChevronDown, ChevronUp, QrCode, ScanLine, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import {
  getOrderById,
  getOrdersForOutlet,
  getOrderPickupMatchForOutletByPickupCode,
  getQrValueForPickupSegment,
  subscribeToOrders,
  verifyOrderPickupSegment,
  validateQrPayload,
  type ByteHiveOrder,
  type ByteHivePickupSegment,
} from "@/features/orders/services/order-portal.service";
import { getVendorOutlet, getVendorOutletId } from "@/features/vendor/services/vendor-portal.service";

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
  const startAttemptRef = useRef(0);
  const [outletName, setOutletName] = useState("");
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [verifiedOrder, setVerifiedOrder] = useState<ByteHiveOrder | null>(null);
  const [verifiedSegment, setVerifiedSegment] = useState<ByteHivePickupSegment | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [readyOrders, setReadyOrders] = useState<ByteHiveOrder[]>([]);
  const [scannerNotice, setScannerNotice] = useState("");
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "ready" | "unsupported" | "blocked">("idle");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [showReadyQueue, setShowReadyQueue] = useState(false);

  useEffect(() => {
    const outlet = getVendorOutlet();
    if (!outlet) {
      navigate("/vendor/unauthorized", { replace: true });
      return;
    }

    const syncOrders = () => {
      const outletOrders = getOrdersForOutlet(outlet).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setReadyOrders(outletOrders.filter((order) => order.status === "ready" || order.status === "partially-collected"));
      setVerifiedOrder((current) => {
        if (!current) return current;
        return outletOrders.find((order) => order.id === current.id) ?? null;
      });
    };

    setOutletName(outlet);
    syncOrders();
    return subscribeToOrders(syncOrders);
  }, [navigate]);

  const stopCamera = useCallback((invalidateAttempt = true) => {
    if (invalidateAttempt) {
      startAttemptRef.current += 1;
    }

    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
  }, []);

  const handleVerify = useCallback((rawValue = scanInput) => {
    setScannerNotice("");

    const parsed = validateQrPayload(rawValue);
    const manualCode = rawValue.trim();
    const pickupCodeMatch = !parsed ? getOrderPickupMatchForOutletByPickupCode(outletName, manualCode) : null;

    if (!parsed && !pickupCodeMatch) {
      setVerifiedOrder(null);
      setVerifiedSegment(null);
      setScanState("invalid");
      return;
    }

    const order = pickupCodeMatch?.order ?? getOrderById(parsed?.orderId ?? "");
    if (!order) {
      setVerifiedOrder(null);
      setVerifiedSegment(null);
      setScanState("invalid");
      return;
    }

    const matchedSegment =
      pickupCodeMatch?.segment ??
      (parsed?.pickupSegmentId
        ? order.pickupSegments.find((segment) => segment.id === parsed.pickupSegmentId)
        : order.pickupSegments.find((segment) => segment.qrToken === parsed?.qrToken) ?? order.pickupSegments[0] ?? null);

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
      setVerifiedSegment(matchedSegment ?? null);
      setScanState("wrong-outlet");
      return;
    }

    if (!matchedSegment) {
      setVerifiedOrder(null);
      setVerifiedSegment(null);
      setScanState("invalid");
      return;
    }

    if (parsed?.qrToken && matchedSegment.qrToken !== parsed.qrToken && order.qrToken !== parsed.qrToken) {
      setVerifiedOrder(null);
      setVerifiedSegment(null);
      setScanState("invalid");
      return;
    }

    if (order.status === "collected") {
      setVerifiedOrder(order);
      setVerifiedSegment(matchedSegment);
      setScanState("already-collected");
      return;
    }

    if (matchedSegment.status === "verified" || order.status === "handoff") {
      setVerifiedOrder(order);
      setVerifiedSegment(matchedSegment);
      setScanState("already-verified");
      return;
    }

    if (order.status !== "ready" && order.status !== "partially-collected") {
      setVerifiedOrder(order);
      setVerifiedSegment(matchedSegment);
      setScanState("invalid");
      return;
    }

    setVerifiedOrder(order);
    setVerifiedSegment(matchedSegment);
    setScanState("success");
  }, [outletName, scanInput]);

  const startCamera = useCallback(async () => {
    const attemptId = startAttemptRef.current + 1;
    startAttemptRef.current = attemptId;

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
      stopCamera(false);
      await new Promise((resolve) => window.setTimeout(resolve, 120));

      if (startAttemptRef.current !== attemptId) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      if (startAttemptRef.current !== attemptId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      if (startAttemptRef.current !== attemptId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
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
        }
      }, 1200);
    } catch {
      if (startAttemptRef.current === attemptId) {
        setCameraState("blocked");
      }
    }
  }, [handleVerify, stopCamera]);

  useEffect(() => {
    if (scanState !== "scanning" || !cameraEnabled) {
      stopCamera();
      if (scanState === "scanning" && !cameraEnabled) {
        setCameraState("idle");
      }
      return;
    }

    void startCamera();
    return () => stopCamera();
  }, [cameraEnabled, scanState, startCamera, stopCamera]);

  const handleMarkCollectedPrompt = async () => {
    if (!verifiedOrder || !verifiedSegment) return;

    const updatedOrder = await verifyOrderPickupSegment(verifiedOrder.id, verifiedSegment.id);
    const remainingSegments = updatedOrder.pickupSegments.filter((segment) => segment.status === "pending");
    setScannerNotice(
      remainingSegments.length > 0
        ? `${verifiedSegment.label} verified for order ${updatedOrder.id}. ${remainingSegments.length} pickup point left to scan.`
        : `All pickup points verified for order ${updatedOrder.id}. The student can now confirm collection.`
    );
    setVerifiedOrder(null);
    setVerifiedSegment(null);
    setScanInput("");
    setScanState("scanning");
  };

  const resetScanner = () => {
    setVerifiedOrder(null);
    setVerifiedSegment(null);
    setScanInput("");
    setScanState("scanning");
    setScannerNotice("");
  };

  const handleCameraToggle = () => {
    if (cameraEnabled) {
      stopCamera();
      setCameraEnabled(false);
      setCameraState("idle");
      return;
    }

    setCameraEnabled(true);
    setScanState("scanning");
  };

  const cameraToggleState =
    cameraState === "blocked" || cameraState === "unsupported"
      ? "warning"
      : cameraEnabled && (cameraState === "ready" || cameraState === "starting")
        ? "on"
        : "off";

  const renderState = () => {
    if (scanState === "scanning") {
      return (
        <div className="vendor-scanner-shell">
          <div className="vendor-scanner-frame">
            <div className="vendor-scanner-surface">
              <video
                ref={videoRef}
                className={`vendor-scanner-video ${cameraState === "ready" ? "vendor-scanner-video-visible" : "vendor-scanner-video-hidden"}`}
                playsInline
                muted
                autoPlay
              />
              {cameraState !== "ready" && (
                <div className="vendor-scanner-placeholder">
                  {cameraEnabled ? <Camera size={40} /> : <CameraOff size={40} />}
                  <p>
                    {!cameraEnabled
                      ? "Camera is off. Turn it on or paste the QR payload below."
                      : cameraState === "starting"
                        ? "Opening camera..."
                        : cameraState === "blocked"
                          ? "Camera access is blocked. Paste the QR payload below."
                        : "Camera preview will appear here if the browser allows QR scanning."}
                  </p>
                </div>
              )}
              <div className="vendor-scanner-focus-overlay" aria-hidden="true">
                <div className="vendor-scanner-focus-window" />
              </div>
            </div>
            <button
              type="button"
              className={`vendor-scanner-frame-icon vendor-scanner-frame-icon-${cameraToggleState}`}
              onClick={handleCameraToggle}
              aria-label={
                cameraEnabled
                  ? "Turn camera off"
                  : cameraState === "blocked"
                    ? "Camera access blocked in browser"
                    : "Turn camera on"
              }
              title={
                cameraState === "blocked" || cameraState === "unsupported"
                  ? "Camera access blocked or unavailable"
                  : cameraEnabled
                    ? "Turn camera off"
                    : "Turn camera on"
              }
            >
              <QrCode size={22} />
            </button>
          </div>

          <div className="vendor-scanner-state">
            <span className="vendor-scan-state-icon"><ScanLine size={28} /></span>
            <h2>Ready to Verify</h2>
            <p>Scan the student QR in the camera box or enter the short pickup code, receipt number, or full QR payload below.</p>
          </div>

          <div className="vendor-field vendor-scanner-narrow">
            <label htmlFor="vendor-qr-input">Pickup code, receipt number, or QR payload</label>
            <input
              id="vendor-qr-input"
              className="vendor-input"
              value={scanInput}
              onChange={(event) => setScanInput(event.target.value)}
              placeholder="0002az or PB-20260403-002"
            />
          </div>

          <div className="vendor-scanner-actions vendor-scanner-narrow">
            <button type="button" className="vendor-button" onClick={() => handleVerify()} disabled={!scanInput.trim()}>
              Verify QR
            </button>
          </div>

          {!!readyOrders.length && (
            <div className="vendor-verified-summary vendor-scanner-narrow vendor-ready-queue-shell">
              <button
                type="button"
                className={`vendor-ready-queue-toggle ${showReadyQueue ? "vendor-ready-queue-toggle-open" : ""}`}
                onClick={() => setShowReadyQueue((value) => !value)}
                aria-expanded={showReadyQueue}
              >
                <div className="vendor-verified-header">
                  <strong>Ready Orders Queue</strong>
                  <span className="vendor-badge">{readyOrders.length}</span>
                </div>
                {showReadyQueue ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              <div className={`vendor-ready-queue-body ${showReadyQueue ? "vendor-ready-queue-body-open" : ""}`}>
                <p className="vendor-form-hint vendor-ready-queue-hint">
                  Open the queue only when you need a quick look at pending ready pickups.
                </p>
                <ul className="vendor-order-items">
                  {readyOrders.slice(0, 6).map((order) => {
                    const pendingSegments = order.pickupSegments.filter((segment) => segment.status === "pending");
                    return (
                      <li key={order.id}>
                        <span>
                          {order.customerName} | #{order.id} | Codes{" "}
                          {pendingSegments.map((segment) => segment.pickupCode).join(", ")}
                        </span>
                        <button
                          type="button"
                          className="vendor-button-ghost"
                          onClick={() => {
                            const nextPendingSegment = pendingSegments[0];
                            if (!nextPendingSegment) return;
                            const qrValue = getQrValueForPickupSegment(order, nextPendingSegment.id);
                            setScanInput(qrValue);
                            handleVerify(qrValue);
                          }}
                        >
                          Verify
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
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
            <h2>{verifiedSegment?.label ?? "Pickup"} Verified</h2>
            <p>
              The outlet and QR token match for the {verifiedSegment?.pickupPoint === "vendor_stall" ? "vendor stall" : "counter"} pickup point.
              Review the order, then confirm this scan.
            </p>
          </div>

          <div className="vendor-verified-summary">
            <div className="vendor-verified-header">
              <strong>Order #{verifiedOrder.id}</strong>
              <span className="vendor-status-badge vendor-status-ready">
                {verifiedOrder.status === "partially-collected" ? "Partially Collected" : "Ready"}
              </span>
            </div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Customer</span><strong>{verifiedOrder.customerName}</strong></div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Outlet</span><strong>{verifiedOrder.outletName}</strong></div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Receipt Number</span><strong>{verifiedOrder.receiptNumber}</strong></div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Pickup Point</span><strong>{verifiedSegment?.label ?? "Counter"}</strong></div>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Pickup Code</span><strong>{verifiedSegment?.pickupCode ?? verifiedOrder.pickupCode}</strong></div>
            <ul className="vendor-order-items">
              {verifiedOrder.items
                .filter((item) => (verifiedSegment?.pickupPoint ?? "counter") === (item.pickupPoint ?? "counter"))
                .map((item) => (
                <li key={`${verifiedOrder.id}-${item.id}`}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>Rs {item.price * item.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="vendor-verified-summary-row"><span className="vendor-muted">Total Amount</span><strong>Rs {verifiedOrder.total}</strong></div>
          </div>

          <div className="vendor-scanner-actions">
            <button type="button" className="vendor-button" onClick={handleMarkCollectedPrompt}>
              Confirm {verifiedSegment?.label ?? "Pickup"} Scan
            </button>
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
        title: "Pickup Already Verified",
        copy:
          verifiedOrder?.status === "handoff"
            ? "All required pickup points are already verified. The student still needs to confirm that the full order was collected."
            : `The ${verifiedSegment?.pickupPoint === "vendor_stall" ? "vendor stall" : "counter"} QR has already been scanned for this order.`,
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

      <Footer variant="vendor" />
    </div>
  );
}

export default VendorQrScannerPage;
