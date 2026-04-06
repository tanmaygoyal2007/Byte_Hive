import { NextRequest, NextResponse } from "next/server";
import { createOtp, isValidOtpEmail, normalizeOtpEmail } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/otp-mail";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? normalizeOtpEmail(body.email) : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!isValidOtpEmail(email)) {
      return NextResponse.json({ error: "Enter a valid college email address." }, { status: 400 });
    }

    const otp = createOtp(email);
    await sendOtpEmail({ to: email, code: otp.code });

    return NextResponse.json({
      ok: true,
      message: "OTP sent successfully.",
      resendAfterSeconds: 30,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send OTP." },
      { status: 400 }
    );
  }
}
