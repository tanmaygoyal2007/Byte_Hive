"use client";

import { Suspense } from "react";
import CanteenCardsPage from "@/features/canteens/components/CanteenCardsPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CanteenCardsPage />
    </Suspense>
  );
}
