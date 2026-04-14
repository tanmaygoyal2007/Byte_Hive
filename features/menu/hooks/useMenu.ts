"use client";

import { getAllMenuItems } from "@/features/orders/services/order-portal.service";

export default function useMenu() {
  return getAllMenuItems();
}
