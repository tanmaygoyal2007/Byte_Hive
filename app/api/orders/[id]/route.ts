import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/features/orders/services/order-portal.service";

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const order = getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json(order);
  });
}
