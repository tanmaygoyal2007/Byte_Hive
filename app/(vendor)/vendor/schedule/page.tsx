"use client";

import { Suspense } from "react";
import VendorSchedulePage from "@/features/vendor/components/VendorSchedulePage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VendorSchedulePage />
    </Suspense>
  );
}
