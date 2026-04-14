"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { CartProvider } from "@/features/cart/store/cart.store";

const AppOverlays = dynamic(
  () => import("@/component/components/feedback/AppOverlays"),
  { ssr: false }
);

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <AppOverlays />
      </CartProvider>
    </AuthProvider>
  );
}
