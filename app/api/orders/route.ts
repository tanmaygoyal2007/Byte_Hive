import { NextRequest, NextResponse } from "next/server";
import { createStoredOrder, getStoredOrders, replaceStoredOrders } from "@/lib/server/order-store";

export async function GET() {
  const orders = await getStoredOrders();
  return NextResponse.json(orders, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!payload?.outletId || !payload?.customerName || !Array.isArray(payload?.items) || payload.items.length === 0) {
      return NextResponse.json({ error: "Invalid order payload." }, { status: 400 });
    }

    const order = await createStoredOrder(payload);
    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create order." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json();
    if (!Array.isArray(payload?.orders)) {
      return NextResponse.json({ error: "Invalid orders snapshot." }, { status: 400 });
    }

    const orders = await replaceStoredOrders(payload.orders);
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: "Unable to save orders snapshot." }, { status: 500 });
  }
}
