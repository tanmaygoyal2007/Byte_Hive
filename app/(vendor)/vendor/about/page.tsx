"use client";

import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "@/components/lib/router";
import { getVendorOutlet } from "@/features/vendor/services/vendor-portal.service";
import VendorLoginPage from "@/features/vendor/components/VendorLoginPage";
import AboutPage from "@/features/about/components/AboutPage";

export const dynamic = "force-dynamic";

export default function Page() {
  const navigate = useNavigate();
  const [vendorOutlet, setVendorOutlet] = useState<string | null>(null);

  useEffect(() => {
    setVendorOutlet(getVendorOutlet());
  }, []);

  useEffect(() => {
    if (vendorOutlet === null) return;
    if (vendorOutlet) {
      navigate("/vendor/dashboard", { replace: true });
    }
  }, [vendorOutlet, navigate]);

  if (vendorOutlet === null) {
    return (
      <Suspense fallback={null}>
        <div style={{ minHeight: "100vh", background: "#0a0a0a" }} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <VendorLoginPage />
    </Suspense>
  );
}
