"use client";

import { getVendorOutlet } from "@/features/vendor/services/vendor-portal.service";

export default function useVendor() {
  return getVendorOutlet();
}
