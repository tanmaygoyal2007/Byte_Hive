// frontend/src/services/paymentService.ts

export interface RazorpayOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface PaymentVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderId: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  orderId: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// Step 1: Create a Razorpay order via your Next.js backend
export async function createPaymentOrder(
  amount: number,
  items: { id: string; name: string; price: number; quantity: number }[],
  canteenId: string
): Promise<RazorpayOrderResponse> {
  const res = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, items, canteenId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create payment order");
  }

  return res.json();
}

// Step 2: Verify payment signature via your Next.js backend
export async function verifyPayment(
  data: PaymentVerifyRequest
): Promise<PaymentResult> {
  const res = await fetch(`${BACKEND_URL}/api/payment/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Payment verification failed");
  }

  return res.json();
}

// Step 3: Open Razorpay checkout popup
export function openRazorpayCheckout(
  orderData: RazorpayOrderResponse,
  userInfo: { name: string; email: string; contact: string },
  onSuccess: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void,
  onFailure: (error: unknown) => void
): void {
  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    name: "ByteHive Canteen",
    description: "Food Order Payment",
    image: "/images/logo.png", // optional: your canteen logo
    order_id: orderData.razorpayOrderId,
    handler: onSuccess,
    prefill: {
      name: userInfo.name,
      email: userInfo.email,
      contact: userInfo.contact,
    },
    notes: {
      orderId: orderData.orderId,
    },
    theme: {
      color: "#f97316", // orange - matches ByteHive food theme
    },
    modal: {
      ondismiss: () => onFailure(new Error("Payment cancelled by user")),
    },
  };

  // @ts-expect-error Razorpay is loaded via CDN script tag
  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", onFailure);
  rzp.open();
}