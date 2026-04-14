"use client";

import { Suspense } from "react";
import CanteenMenuPage from "@/features/menu/components/CanteenMenuPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CanteenMenuPage />
    </Suspense>
  );
}
