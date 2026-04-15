import { NextRequest, NextResponse } from "next/server";
import { createOtp, getRequiredOtpDomain, isValidOtpEmail, normalizeOtpEmail } from "@/lib/utils/otp";
import { sendOtpEmail } from "@/lib/utils/otp-mail";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? normalizeOtpEmail(body.email) : "";
    const role = body?.role === "faculty" ? "faculty" : "student";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!isValidOtpEmail(email, role)) {
      return NextResponse.json({ error: `Use a valid ${role} email ending with @${getRequiredOtpDomain(role).replace(/^\./, "")}.` }, { status: 400 });
    }

    const otp = await createOtp(email);
    const delivery = await sendOtpEmail({ to: email, code: otp.code });
    const resendAfterSeconds = 60;
    const expiresInSeconds = Math.max(1, Math.ceil((otp.expiresAt - Date.now()) / 1000));

    return NextResponse.json({
      ok: true,
      message: delivery.delivered ? "OTP sent successfully." : "OTP created successfully.",
      expiresAt: otp.expiresAt,
      expiresInSeconds,
      resendAvailableAt: otp.resendAvailableAt,
      resendAfterSeconds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send OTP." },
      { status: 400 }
    );
  }
}
