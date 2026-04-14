"use client";

import { Suspense } from "react";
import VendorDashboardPage from "@/features/vendor/components/VendorDashboardPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VendorDashboardPage />
    </Suspense>
  );
}
