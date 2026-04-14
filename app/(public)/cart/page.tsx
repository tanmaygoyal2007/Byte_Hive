"use client";

import { Suspense } from "react";
import CartPage from "@/features/cart/components/CartPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CartPage />
    </Suspense>
  );
}
