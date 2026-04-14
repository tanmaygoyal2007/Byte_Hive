"use client";

import { Suspense } from "react";
import HomePage from "@/features/home/components/HomePage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
