// backend/app/api/payment/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment fields" },
        { status: 400 }
      );
    }

    // ✅ Verify HMAC signature — this is the security step
    // Razorpay signs: razorpay_order_id + "|" + razorpay_payment_id
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay environment variables are missing." },
        { status: 500 }
      );
    }

    const expectedSignature = createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      console.warn("⚠️ Invalid payment signature for order:", orderId);
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // ✅ Payment is verified — update your DB here
    // await db.orders.update({ orderId, status: 'paid', paymentId: razorpay_payment_id })

    console.log(`✅ Payment verified: ${razorpay_payment_id} for order ${orderId}`);

    return NextResponse.json({
      success: true,
      paymentId: razorpay_payment_id,
      orderId,
    });
  } catch (err) {
    console.error("verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
