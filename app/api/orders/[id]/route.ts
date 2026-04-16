import { NextRequest, NextResponse } from "next/server";
import { getStoredOrderById, updateStoredOrderStatus, updateStoredOrderTiming } from "@/lib/server/order-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await getStoredOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(order, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await request.json();

    if (typeof payload?.status === "string") {
      const updated = await updateStoredOrderStatus(id, payload.status);
      if (!updated) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    const updated = await updateStoredOrderTiming(id, payload ?? {});
    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update order." }, { status: 500 });
  }
}
