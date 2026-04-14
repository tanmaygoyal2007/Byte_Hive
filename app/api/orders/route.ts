import { NextResponse } from "next/server";
import { getAllOrders } from "@/features/orders/services/order-portal.service";

export function GET() {
  return NextResponse.json(getAllOrders());
}
