"use client";

import { getAllOrders } from "@/features/orders/services/order-portal.service";

export default function useOrders() {
  return getAllOrders();
}
