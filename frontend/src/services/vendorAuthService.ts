import { postJson } from "./api";

type VendorAuthResponse = {
  success: boolean;
  outletName: string;
};

export async function authenticateVendor(outletName: string, masterKey: string) {
  return postJson<VendorAuthResponse>(
    "/api/vendor/auth",
    { outletName, masterKey },
    "Vendor authentication failed."
  );
}
