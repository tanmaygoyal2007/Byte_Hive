import { useEffect, useState } from "react";
import { useNavigate } from "@/components/lib/router";
import {
  createPaymentOrder,
  openRazorpayCheckout,
  verifyPayment,
} from "@/features/payment/services/payment.service";
import {
  createOrder,
  getCurrentUserSession,
  getOutletMetaById,
  requestAuthPrompt,
  subscribeToUserSession,
  type UserSession,
} from "@/features/orders/services/order-portal.service";
import { getVendorClosureLabel, getVendorOutletStatus, subscribeToVendorStatus } from "@/features/vendor/services/vendor-portal.service";
import { subscribeToAuthState } from "@/features/auth/services/auth.service";
import type { AuthUser } from "@/features/auth/services/auth.service";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  canteenId?: string;
  pickupPoint?: "counter" | "vendor_stall";
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
  const [userSession, setUserSession] = useState<UserSession | null>(() => getCurrentUserSession());
  const outletMeta = getOutletMetaById(canteenId);
  const [isOutletOpen, setIsOutletOpen] = useState(() =>
    canteenId && canteenId !== "default" ? getVendorOutletStatus(outletMeta.name) : true
  );
  const [closureLabel, setClosureLabel] = useState<string | null>(() =>
    canteenId && canteenId !== "default" ? getVendorClosureLabel(outletMeta.name) : null
  );

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  useEffect(() => {
    const syncSession = () => {
      const session = getCurrentUserSession();
      setUserSession(session);
    };
    const syncAuth = (authUser: AuthUser | null) => {
      if (authUser) {
        setUserSession({
          authRole: "student",
          userName: authUser.displayName || authUser.email,
        });
      } else {
        const session = getCurrentUserSession();
        if (session) {
          setUserSession(session);
        } else {
          setUserSession(null);
        }
      }
    };
    syncSession();
    subscribeToUserSession(syncSession);
    subscribeToAuthState(syncAuth);
    return () => {};
  }, []);

  useEffect(() => {
    const syncVendorStatus = () => {
      if (!canteenId || canteenId === "default") {
        setIsOutletOpen(true);
        setClosureLabel(null);
        return;
      }

      setIsOutletOpen(getVendorOutletStatus(outletMeta.name));
      setClosureLabel(getVendorClosureLabel(outletMeta.name));
    };

    syncVendorStatus();
    const unsubscribe = subscribeToVendorStatus(syncVendorStatus);
    const interval = window.setInterval(syncVendorStatus, 30000);

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [canteenId, outletMeta.name]);

  const handlePayment = async () => {
    if (!scriptReady) {
      setError("Razorpay checkout is still loading or blocked. Please refresh and try again.");
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!userSession || userSession.authRole === "guest") {
      requestAuthPrompt({ reason: "checkout", role: "student" });
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

    if (!isOutletOpen) {
      setError(closureLabel ?? `${outletMeta.name} is currently closed for checkout. Please try again after the vendor reopens the outlet.`);
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

            const savedOrder = await createOrder({
              paymentId: result.paymentId,
              outletId: canteenId,
              customerName: userSession?.userName ?? "Guest User",
              customerRole: userSession?.authRole ?? "guest",
              items: items.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                pickupPoint: item.pickupPoint,
              })),
            });

            setStatus("success");
            onPaymentSuccess?.(result.paymentId, savedOrder.id);

            navigate(`/receipt?orderId=${encodeURIComponent(savedOrder.id)}`, {
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
  const requiresAuth = !userSession || userSession.authRole === "guest";
  const ctaLabel = !isOutletOpen
    ? "Checkout Temporarily Closed"
    : requiresAuth
      ? "Login or Sign Up for Payment"
      : `Pay Rs ${total.toFixed(2)} Securely`;

  return (
    <div className="payment-button-wrapper">
      {error && (
        <div className="payment-error">
          <span>{error}</span>
          <button onClick={() => { setError(null); setStatus("idle"); }}>x</button>
        </div>
      )}

      <button
        className={`payment-btn payment-btn--${!isOutletOpen && !isLoading ? "blocked" : status}`}
        onClick={handlePayment}
        disabled={isLoading || items.length === 0}
      >
        {status === "loading" && <><span className="payment-spinner" /> Creating order...</>}
        {status === "processing" && <><span className="payment-spinner" /> Processing...</>}
        {status === "idle" && <>{ctaLabel}</>}
        {status === "success" && <>Payment Successful!</>}
        {status === "failed" && <>Try Again</>}
      </button>

      <p className="payment-secure-note">
        Secured by Razorpay | UPI | Cards | Net Banking
      </p>
    </div>
  );
}
