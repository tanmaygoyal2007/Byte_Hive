"use client";

import { Suspense } from "react";
import ReceiptPage from "@/features/orders/components/ReceiptPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReceiptPage />
    </Suspense>
  );
}
