// frontend/src/services/orderService.ts

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  orderId: string;
  canteenId: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "paid" | "preparing" | "ready" | "completed";
  paymentId?: string;
  createdAt: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// Create a new order record
export async function createOrder(
  canteenId: string,
  items: OrderItem[],
  totalAmount: number
): Promise<Order> {
  const res = await fetch(`${BACKEND_URL}/api/orders/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canteenId, items, totalAmount }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create order");
  }

  return res.json();
}

// Update order status after payment
export async function updateOrderStatus(
  orderId: string,
  status: Order["status"],
  paymentId?: string
): Promise<Order> {
  const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, paymentId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update order");
  }

  return res.json();
}

// Get order by ID (for receipt page)
export async function getOrder(orderId: string): Promise<Order> {
  const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`);

  if (!res.ok) {
    throw new Error("Order not found");
  }

  return res.json();
}