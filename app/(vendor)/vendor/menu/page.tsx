"use client";

import { Suspense } from "react";
import VendorMenuPage from "@/features/vendor/components/VendorMenuPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VendorMenuPage />
    </Suspense>
  );
}
