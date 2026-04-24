"use client";

import { Suspense } from "react";
import UnauthorizedVendorPage from "@/features/vendor/components/UnauthorizedVendorPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UnauthorizedVendorPage />
    </Suspense>
  );
}