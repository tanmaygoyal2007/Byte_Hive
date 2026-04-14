"use client";

import { Suspense } from "react";
import VendorQrScannerPage from "@/features/vendor/components/VendorQrScannerPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VendorQrScannerPage />
    </Suspense>
  );
}
