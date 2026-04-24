"use client";

import { useLayoutEffect } from "react";
import HomePage from "@/features/home/components/HomePage";

export default function PopularPage() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const el = document.getElementById("popular");
    if (el) {
      el.scrollIntoView();
    }
  }, []);

  return <HomePage />;
}