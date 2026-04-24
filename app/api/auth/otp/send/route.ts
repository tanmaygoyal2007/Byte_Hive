import { NextRequest, NextResponse } from "next/server";
import { createOtp, getRequiredOtpDomain, isValidOtpEmail, normalizeOtpEmail } from "@/lib/utils/otp";
import { sendOtpEmail } from "@/lib/utils/otp-mail";

const OTP_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

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

    const otp = await withTimeout(createOtp(email), OTP_TIMEOUT_MS, "Unable to connect to OTP service. Please try again.");
    const delivery = await withTimeout(sendOtpEmail({ to: email, code: otp.code }), OTP_TIMEOUT_MS, "Unable to send OTP email. Please try again.");
    const resendAfterSeconds = 60;
    const expiresInSeconds = Math.max(1, Math.ceil((otp.expiresAt - Date.now()) / 1000));
    const isDevFallback = !delivery.delivered && process.env.NODE_ENV !== "production";

    return NextResponse.json({
      ok: true,
      delivered: delivery.delivered,
      mirrored: Boolean(delivery.mirrored),
      message: delivery.delivered
        ? delivery.mirrored
          ? "OTP sent to the local dev mailbox."
          : "OTP sent successfully."
        : isDevFallback
          ? `Email delivery is not configured locally. Use this OTP for testing: ${otp.code}`
          : "OTP created successfully.",
      debugCode: isDevFallback ? otp.code : null,
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
