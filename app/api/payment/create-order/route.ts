import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getRazorpayClient } from "@/lib/integrations/razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { amount, items, canteenId } = await req.json();
    const razorpay = getRazorpayClient();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const amountInPaise = Math.round(amount * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${randomUUID().slice(0, 8)}`,
      notes: {
        canteenId,
        itemCount: items?.length ?? 0,
      },
    });

    const orderId = `order_${randomUUID().slice(0, 12)}`;

    return NextResponse.json({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 500 }
    );
  }
}
