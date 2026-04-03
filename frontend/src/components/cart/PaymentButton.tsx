// frontend/src/components/cart/PaymentButton.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPaymentOrder,
  verifyPayment,
  openRazorpayCheckout,
} from "../../services/paymentService";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PaymentButtonProps {
  items: CartItem[];
  total: number;
  canteenId: string;
  onPaymentStart?: () => void;
  onPaymentSuccess?: (paymentId: string, orderId: string) => void;
  onPaymentFailure?: (error: string) => void;
}

// Inject Razorpay script once
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
      setError("Payment system not ready. Please refresh.");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setStatus("loading");
    setError(null);
    onPaymentStart?.();

    try {
      // Step 1: Create order on backend
      const orderData = await createPaymentOrder(total, items, canteenId);

      setStatus("processing");

      // Step 2: Open Razorpay popup
      openRazorpayCheckout(
        orderData,
        {
          name: "Student",          // Replace with auth user data if available
          email: "student@college.edu",
          contact: "9999999999",
        },
        async (razorpayResponse) => {
          // Step 3: Verify payment on backend
          try {
            const result = await verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              orderId: orderData.orderId,
            });

            setStatus("success");
            onPaymentSuccess?.(result.paymentId, result.orderId);

            // Navigate to receipt page
            navigate(`/receipt/${result.orderId}`, {
              state: {
                paymentId: result.paymentId,
                orderId: result.orderId,
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
          <span>⚠️ {error}</span>
          <button onClick={() => { setError(null); setStatus("idle"); }}>✕</button>
        </div>
      )}

      <button
        className={`payment-btn payment-btn--${status}`}
        onClick={handlePayment}
        disabled={isLoading || items.length === 0}
      >
        {status === "loading" && (
          <><span className="payment-spinner" /> Creating order...</>
        )}
        {status === "processing" && (
          <><span className="payment-spinner" /> Processing...</>
        )}
        {status === "idle" && (
          <>🔒 Pay ₹{total.toFixed(2)} Securely</>
        )}
        {status === "success" && <>✅ Payment Successful!</>}
        {status === "failed" && <>↩ Try Again</>}
      </button>

      <p className="payment-secure-note">
        🔐 Secured by Razorpay · UPI · Cards · Net Banking
      </p>
    </div>
  );
}