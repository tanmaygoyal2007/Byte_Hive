"use client";

import { Suspense } from "react";
import VendorLoginPage from "@/features/vendor/components/VendorLoginPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VendorLoginPage />
    </Suspense>
  );
}
