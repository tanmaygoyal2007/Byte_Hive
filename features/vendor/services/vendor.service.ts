import { postJson } from "@/components/utils/api";

type VendorAuthResponse = {
  success: boolean;
  outletName: string;
};

const VENDOR_AUTH_ACCOUNTS_KEY = "bytehive-vendor-auth-accounts";

type VendorAccountRecord = {
  outletName: string;
  password: string;
};

function readVendorAccounts() {
  if (typeof window === "undefined") return [] as VendorAccountRecord[];

  try {
    const stored = localStorage.getItem(VENDOR_AUTH_ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) as VendorAccountRecord[] : [];
  } catch {
    return [] as VendorAccountRecord[];
  }
}

function saveVendorAccounts(accounts: VendorAccountRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VENDOR_AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function verifyVendorMasterKey(outletName: string, masterKey: string) {
  return postJson<VendorAuthResponse>(
    "/api/vendor/auth",
    { outletName, masterKey },
    "Vendor authentication failed."
  );
}

export function hasVendorAccount(outletName: string) {
  return readVendorAccounts().some((account) => account.outletName === outletName);
}

export function signupVendorWithPassword(outletName: string, password: string) {
  const accounts = readVendorAccounts();

  if (accounts.some((account) => account.outletName === outletName)) {
    throw new Error("Vendor account already exists for this outlet.");
  }

  saveVendorAccounts([
    ...accounts,
    {
      outletName,
      password,
    },
  ]);

  return {
    success: true,
    outletName,
  };
}

export function loginVendorWithPassword(outletName: string, password: string) {
  const account = readVendorAccounts().find((entry) => entry.outletName === outletName);

  if (!account) {
    throw new Error("No vendor account found for this outlet. Sign up first.");
  }

  if (account.password !== password) {
    throw new Error("Invalid outlet or password.");
  }

  return {
    success: true,
    outletName,
  };
}
