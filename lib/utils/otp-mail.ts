import nodemailer from "nodemailer";
import { addMirroredEmail } from "@/lib/utils/dev-mailbox";

type SendOtpEmailResult = {
  delivered: boolean;
  mirrored?: boolean;
};

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

  if (!host || !port || !user || !pass || !fromEmail) {
    if (process.env.NODE_ENV !== "production") {
      await addMirroredEmail({
        from: fromEmail || "bytehive-local@dev.local",
        to: params.to,
        subject,
        html,
      });
      return { delivered: true, mirrored: true };
    }

    return { delivered: false };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: fromEmail,
    to: params.to,
    subject,
    html,
  });

  return { delivered: true };
}
