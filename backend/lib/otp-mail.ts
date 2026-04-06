import { Resend } from "resend";

export async function sendOtpEmail(params: {
  to: string;
  code: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.OTP_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("OTP email delivery is not configured yet. Add RESEND_API_KEY in backend/.env.local.");
  }

  if (!fromEmail) {
    throw new Error("OTP sender address is missing. Add OTP_FROM_EMAIL in backend/.env.local.");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [params.to],
    subject: "Your ByteHive OTP Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">ByteHive OTP Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 18px 0; color: #d76f21;">
          ${params.code}
        </div>
        <p>This OTP is valid for 5 minutes.</p>
        <p>If you did not request this verification, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Unable to send OTP email.");
  }
}
