import { getRedisClient } from "@/lib/services/redis";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_TTL_SECONDS = Math.floor(OTP_TTL_MS / 1000);
const OTP_RESEND_MS = 60 * 1000;
const otpKey = (email: string) => `bytehive:otp:${normalizeOtpEmail(email)}`;
type OtpRole = "student" | "faculty";

type OtpRecord = {
  code: string;
  expiresAt: number;
  resendAvailableAt: number;
  verified: boolean;
};

export function normalizeOtpEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getRequiredOtpDomain(role: OtpRole) {
  return role === "faculty" ? "christuniversity.in" : ".christuniversity.in";
}

export function isValidOtpEmail(email: string, role: OtpRole = "student") {
  const normalized = normalizeOtpEmail(email);
  if (!normalized || normalized.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  if (normalized.includes("..")) return false;

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
  if (domain.startsWith("-") || domain.endsWith("-")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (role === "faculty" ? domain !== "christuniversity.in" : !normalized.endsWith(".christuniversity.in")) return false;

  return true;
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function readOtpRecord(email: string) {
  const client = await getRedisClient();
  const serialized = await client.get(otpKey(email));

  if (!serialized) {
    return null;
  }

  try {
    const record = JSON.parse(serialized) as OtpRecord;
    if (record.expiresAt <= Date.now()) {
      await client.del(otpKey(email));
      return null;
    }
    return record;
  } catch {
    await client.del(otpKey(email));
    return null;
  }
}

async function writeOtpRecord(email: string, record: OtpRecord) {
  const client = await getRedisClient();
  await client.setEx(otpKey(email), OTP_TTL_SECONDS, JSON.stringify(record));
}

export async function createOtp(email: string) {
  const normalizedEmail = normalizeOtpEmail(email);
  const existing = await readOtpRecord(normalizedEmail);
  const now = Date.now();

  if (existing && existing.resendAvailableAt > now) {
    throw new Error(`Please wait ${Math.ceil((existing.resendAvailableAt - now) / 1000)} seconds before requesting another OTP.`);
  }

  const code = generateOtpCode();
  const record = {
    code,
    expiresAt: now + OTP_TTL_MS,
    resendAvailableAt: now + OTP_RESEND_MS,
    verified: false,
  } satisfies OtpRecord;

  await writeOtpRecord(normalizedEmail, record);

  return {
    code,
    expiresAt: record.expiresAt,
    resendAvailableAt: record.resendAvailableAt,
  };
}

export async function verifyOtp(email: string, code: string) {
  const normalizedEmail = normalizeOtpEmail(email);
  const record = await readOtpRecord(normalizedEmail);

  if (!record) {
    throw new Error("Send an OTP first.");
  }

  if (Date.now() > record.expiresAt) {
    const client = await getRedisClient();
    await client.del(otpKey(normalizedEmail));
    throw new Error("OTP expired. Please request a new code.");
  }

  if (record.code !== code.trim()) {
    throw new Error("Incorrect OTP. Please try again.");
  }

  await writeOtpRecord(normalizedEmail, { ...record, verified: true });
  return true;
}

export async function clearOtp(email: string) {
  const client = await getRedisClient();
  await client.del(otpKey(email));
}
