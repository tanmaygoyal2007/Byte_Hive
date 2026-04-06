const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const REQUIRED_EMAIL_SUFFIX = ".christuniversity.in";

type OtpRecord = {
  code: string;
  expiresAt: number;
  resendAvailableAt: number;
  verified: boolean;
};

const globalOtpStore = globalThis as typeof globalThis & {
  __bytehiveOtpStore?: Map<string, OtpRecord>;
};

function getStore() {
  if (!globalOtpStore.__bytehiveOtpStore) {
    globalOtpStore.__bytehiveOtpStore = new Map<string, OtpRecord>();
  }

  return globalOtpStore.__bytehiveOtpStore;
}

export function normalizeOtpEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidOtpEmail(email: string) {
  const normalized = normalizeOtpEmail(email);
  if (!normalized || normalized.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  if (!normalized.endsWith(REQUIRED_EMAIL_SUFFIX)) return false;
  if (normalized.includes("..")) return false;

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
  if (domain.startsWith("-") || domain.endsWith("-")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;

  return true;
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createOtp(email: string) {
  const store = getStore();
  const normalizedEmail = normalizeOtpEmail(email);
  const existing = store.get(normalizedEmail);
  const now = Date.now();

  if (existing && existing.resendAvailableAt > now) {
    throw new Error(`Please wait ${Math.ceil((existing.resendAvailableAt - now) / 1000)} seconds before requesting another OTP.`);
  }

  const code = generateOtpCode();
  store.set(normalizedEmail, {
    code,
    expiresAt: now + OTP_TTL_MS,
    resendAvailableAt: now + OTP_RESEND_MS,
    verified: false,
  });

  return {
    code,
    expiresAt: now + OTP_TTL_MS,
    resendAvailableAt: now + OTP_RESEND_MS,
  };
}

export function verifyOtp(email: string, code: string) {
  const store = getStore();
  const normalizedEmail = normalizeOtpEmail(email);
  const record = store.get(normalizedEmail);

  if (!record) {
    throw new Error("Send an OTP first.");
  }

  if (Date.now() > record.expiresAt) {
    store.delete(normalizedEmail);
    throw new Error("OTP expired. Please request a new code.");
  }

  if (record.code !== code.trim()) {
    throw new Error("Incorrect OTP. Please try again.");
  }

  store.set(normalizedEmail, { ...record, verified: true });
  return true;
}

export function clearOtp(email: string) {
  getStore().delete(normalizeOtpEmail(email));
}
