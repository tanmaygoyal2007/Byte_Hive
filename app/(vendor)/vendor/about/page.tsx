"use client";

import { Suspense } from "react";
import AboutPage from "@/features/about/components/AboutPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AboutPage />
    </Suspense>
  );
}
