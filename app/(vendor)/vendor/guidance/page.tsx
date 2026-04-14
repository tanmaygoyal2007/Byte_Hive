"use client";

import { Suspense } from "react";
import VendorGuidancePage from "@/features/vendor/components/VendorGuidancePage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VendorGuidancePage />
    </Suspense>
  );
}
