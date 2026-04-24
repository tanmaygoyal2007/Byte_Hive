"use client";

import { useLayoutEffect } from "react";
import HomePage from "@/features/home/components/HomePage";

export default function ContactUsPage() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const el = document.getElementById("contact-us");
    if (el) {
      el.scrollIntoView();
    }
  }, []);

  return <HomePage />;
}