type SendOtpResponse = {
  ok: true;
  delivered: boolean;
  message: string;
  debugCode: string | null;
  expiresAt: number;
  expiresInSeconds: number;
  resendAvailableAt: number;
  resendAfterSeconds: number;
};

type VerifyOtpResponse = {
  ok: true;
  verified: true;
};

async function readJsonOrThrow<T>(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "OTP request failed.");
  }

  return data as T;
}

export async function sendSignupOtp(email: string, role: "student" | "faculty") {
  const response = await fetch("/api/auth/otp/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, role }),
  });

  return readJsonOrThrow<SendOtpResponse>(response);
}

export async function verifySignupOtp(email: string, code: string, role: "student" | "faculty") {
  const response = await fetch("/api/auth/otp/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, code, role }),
  });

  return readJsonOrThrow<VerifyOtpResponse>(response);
}
