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
async function parseErrorResponse(res: Response, fallback: string) {
  try {
    const payload = await res.json();
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

function getFetchErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return `Cannot reach payment backend at ${BACKEND_URL}. Make sure the backend server is running on that port.`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function createPaymentOrder(
  amount: number,
  items: { id: string; name: string; price: number; quantity: number }[],
  canteenId: string
): Promise<RazorpayOrderResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, items, canteenId }),
    });

    if (!res.ok) {
      throw new Error(await parseErrorResponse(res, "Failed to create payment order"));
    }

    return res.json();
  } catch (error) {
    throw new Error(getFetchErrorMessage(error, "Payment server is unavailable. Please start the backend and try again."));
  }
}

export async function verifyPayment(
  data: PaymentVerifyRequest
): Promise<PaymentResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/payment/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(await parseErrorResponse(res, "Payment verification failed"));
    }

    return res.json();
  } catch (error) {
    throw new Error(getFetchErrorMessage(error, "Payment verification failed because the backend is unavailable."));
  }
}

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
  if (typeof window === "undefined" || !("Razorpay" in window)) {
    onFailure(new Error("Razorpay checkout failed to load. Please refresh the page and disable any script blockers."));
    return;
  }

  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    name: "ByteHive Canteen",
    description: "Food Order Payment",
    image: "/images/logo.png",
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
      color: "#f97316",
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
