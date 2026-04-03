// backend/app/api/payment/create-order/route.ts

import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { randomUUID } from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { amount, items, canteenId } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // amount must be in paise (1 INR = 100 paise)
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

    // Generate your own internal order ID
    const orderId = `order_${randomUUID().slice(0, 12)}`;

    // TODO: Save order to your database here
    // await db.orders.create({ orderId, razorpayOrderId: razorpayOrder.id, items, amount, canteenId, status: 'pending' })

    return NextResponse.json({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}