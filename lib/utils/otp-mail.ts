import nodemailer from "nodemailer";
import { addMirroredEmail } from "@/lib/utils/dev-mailbox";

type SendOtpEmailResult = {
  delivered: boolean;
  mirrored?: boolean;
};

function shouldUseDevMailboxFallback() {
  if (process.env.NODE_ENV === "production") return false;
  return ["true", "1", "yes"].includes((process.env.OTP_DEV_MAILBOX_FALLBACK || "").toLowerCase());
}

export async function sendOtpEmail(params: {
  to: string;
  code: string;
}): Promise<SendOtpEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = ["true", "1", "yes"].includes((process.env.SMTP_SECURE || "").toLowerCase());
  const fromEmail = process.env.OTP_FROM_EMAIL || user;
  const subject = "Your ByteHive OTP Verification Code";
  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">ByteHive OTP Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 18px 0; color: #d76f21;">
          ${params.code}
        </div>
        <p>This OTP is valid for 5 minutes.</p>
        <p>If you did not request this verification, you can ignore this email.</p>
      </div>
    `;

  async function mirrorEmail() {
    await addMirroredEmail({
      from: fromEmail || "bytehive-local@dev.local",
      to: params.to,
      subject,
      html,
    });

    return { delivered: true, mirrored: true };
  }

  if (!host || !port || !user || !pass || !fromEmail) {
    return shouldUseDevMailboxFallback() ? mirrorEmail() : { delivered: false };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls:
      process.env.NODE_ENV !== "production"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: params.to,
      subject,
      html,
    });
  } catch (error) {
    if (shouldUseDevMailboxFallback()) {
      console.warn("SMTP delivery failed. Mirroring OTP email locally instead.", error);
      return mirrorEmail();
    }

    throw new Error(
      process.env.NODE_ENV === "production"
        ? "Unable to send OTP email. Please try again later."
        : "Gmail rejected the SMTP credentials. Update SMTP_USER and SMTP_PASS in .env.local with a valid app password."
    );
  }

  return { delivered: true };
}
