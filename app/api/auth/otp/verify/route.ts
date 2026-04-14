import { NextRequest, NextResponse } from "next/server";
import { isValidOtpEmail, normalizeOtpEmail, verifyOtp } from "@/lib/utils/otp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? normalizeOtpEmail(body.email) : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    if (!isValidOtpEmail(email)) {
      return NextResponse.json({ error: "Enter a valid college email address." }, { status: 400 });
    }

    verifyOtp(email, code);
    return NextResponse.json({ ok: true, verified: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify OTP." },
      { status: 400 }
    );
  }
}
