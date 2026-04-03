import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPaymentOrder,
  openRazorpayCheckout,
  verifyPayment,
} from "../../services/paymentService";
import { createOrder, getCurrentUserSession, getOutletMetaById, requestAuthPrompt } from "../../utils/orderPortal";
import { getVendorOutletStatus, openVendorPortalWindow } from "../../utils/vendorPortal";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  canteenId?: string;
}

interface PaymentButtonProps {
  items: CartItem[];
  total: number;
  canteenId: string;
  onPaymentStart?: () => void;
  onPaymentSuccess?: (paymentId: string, orderId: string) => void;
  onPaymentFailure?: (error: string) => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) return resolve(true);

    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentButton({
  items,
  total,
  canteenId,
  onPaymentStart,
  onPaymentSuccess,
  onPaymentFailure,
}: PaymentButtonProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "loading" | "processing" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  const handlePayment = async () => {
    if (!scriptReady) {
      setError("Razorpay checkout is still loading or blocked. Please refresh and try again.");
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const userSession = getCurrentUserSession();
    if (!userSession) {
      setError("Please login or sign up before placing an order.");
      requestAuthPrompt({ reason: "checkout", role: "student" });
      return;
    }

    if (userSession.authRole === "guest") {
      setError("Guest mode can save items in cart, but payment requires student or faculty login.");
      requestAuthPrompt({ reason: "upgrade-guest", role: "student" });
      return;
    }

    if (!canteenId || canteenId === "default") {
      setError("We could not determine the outlet for this order. Please re-add the item from the menu.");
      return;
    }

    const uniqueOutletIds = new Set(items.map((item) => item.canteenId).filter(Boolean));
    if (uniqueOutletIds.size > 1) {
      setError("A single order can only contain items from one outlet. Please keep items from one vendor only.");
      return;
    }

    const outletMeta = getOutletMetaById(canteenId);
    if (!getVendorOutletStatus(outletMeta.name)) {
      setError(`${outletMeta.name} is currently closed. Please try again after the vendor reopens the outlet.`);
      openVendorPortalWindow(outletMeta.name);
      return;
    }

    setStatus("loading");
    setError(null);
    onPaymentStart?.();

    try {
      const orderData = await createPaymentOrder(total, items, canteenId);

      setStatus("processing");

      openRazorpayCheckout(
        orderData,
        {
          name: userSession?.userName ?? "Guest User",
          email: "student@college.edu",
          contact: "9999999999",
        },
        async (razorpayResponse) => {
          try {
            const result = await verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              orderId: orderData.orderId,
            });

            const savedOrder = createOrder({
              paymentId: result.paymentId,
              outletId: canteenId,
              customerName: userSession?.userName ?? "Guest User",
              customerRole: userSession?.authRole ?? "guest",
              items: items.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })),
            });

            setStatus("success");
            onPaymentSuccess?.(result.paymentId, savedOrder.id);

            navigate(`/receipt/${savedOrder.id}`, {
              state: {
                paymentId: result.paymentId,
                orderId: savedOrder.id,
                items,
                total,
              },
            });
          } catch (verifyErr) {
            const msg = verifyErr instanceof Error ? verifyErr.message : "Verification failed";
            setStatus("failed");
            setError(msg);
            onPaymentFailure?.(msg);
          }
        },
        (failErr) => {
          const msg = failErr instanceof Error ? failErr.message : "Payment failed";
          setStatus("failed");
          setError(msg);
          onPaymentFailure?.(msg);
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setStatus("failed");
      setError(msg);
      onPaymentFailure?.(msg);
    }
  };

  const isLoading = status === "loading" || status === "processing";

  return (
    <div className="payment-button-wrapper">
      {error && (
        <div className="payment-error">
          <span>{error}</span>
          <button onClick={() => { setError(null); setStatus("idle"); }}>x</button>
        </div>
      )}

      <button
        className={`payment-btn payment-btn--${status}`}
        onClick={handlePayment}
        disabled={isLoading || items.length === 0}
      >
        {status === "loading" && <><span className="payment-spinner" /> Creating order...</>}
        {status === "processing" && <><span className="payment-spinner" /> Processing...</>}
        {status === "idle" && <>Pay Rs {total.toFixed(2)} Securely</>}
        {status === "success" && <>Payment Successful!</>}
        {status === "failed" && <>Try Again</>}
      </button>

      <p className="payment-secure-note">
        Secured by Razorpay | UPI | Cards | Net Banking
      </p>
    </div>
  );
}
