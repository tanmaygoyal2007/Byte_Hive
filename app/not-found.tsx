"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Sparkles, UtensilsCrossed } from "lucide-react";
import Footer from "@/components/components/layout/Footer";
import NavbarWrapper from "./components/NavbarWrapper";
import "./not-found.css";

export default function NotFound() {
  const pathname = usePathname();
  const isVendorPage = pathname.startsWith("/vendor");

  return (
    <div className="not-found-wrapper">
      <NavbarWrapper forceUserMode />

      <main className="not-found-container">
        <div className="not-found-content">
          <div className="not-found-badge">Oops!</div>

          <div className="not-found-illustration">
            <div className="not-found-plate">
              <div className="not-found-plate-inner">
                <UtensilsCrossed size={56} strokeWidth={1.5} />
              </div>
              <div className="not-found-plate-rim"></div>
            </div>
            <div className="not-found-sparkles">
              <Sparkles className="sparkle sparkle-1" size={16} aria-hidden="true" />
              <Sparkles className="sparkle sparkle-2" size={16} aria-hidden="true" />
              <Sparkles className="sparkle sparkle-3" size={16} aria-hidden="true" />
              <Sparkles className="sparkle sparkle-4" size={16} aria-hidden="true" />
            </div>
          </div>

          <div className="not-found-text">
            <h1 className="not-found-title">404</h1>
            <h2 className="not-found-subtitle">Page Not Found</h2>
            <p className="not-found-description">
              Looks like this page got lost in the kitchen!
              The dish you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          <div className="not-found-actions">
            <Link href={isVendorPage ? "/vendor/dashboard" : "/"} className="not-found-btn not-found-btn-primary">
              <Home size={20} />
              {isVendorPage ? "Back to Dashboard" : "Back to Home"}
            </Link>
            <Link href={isVendorPage ? "/vendor/menu" : "/canteens"} className="not-found-btn not-found-btn-secondary">
              <Compass size={20} />
              {isVendorPage ? "View Menu" : "Explore Menu"}
            </Link>
          </div>

          <div className="not-found-features">
            <div className="not-found-feature">
              <div className="not-found-feature-icon">
                <UtensilsCrossed size={22} />
              </div>
              <div className="not-found-feature-content">
                <span className="not-found-feature-title">Fresh Canteen Food</span>
                <span className="not-found-feature-desc">Hot & delicious meals</span>
              </div>
            </div>
            <div className="not-found-feature">
              <div className="not-found-feature-icon">
                <Compass size={22} />
              </div>
              <div className="not-found-feature-content">
                <span className="not-found-feature-title">Quality Vendors</span>
                <span className="not-found-feature-desc">Trusted partners</span>
              </div>
            </div>
            <div className="not-found-feature">
              <div className="not-found-feature-icon">
                <Home size={22} />
              </div>
              <div className="not-found-feature-content">
                <span className="not-found-feature-title">Easy Ordering</span>
                <span className="not-found-feature-desc">Quick & simple</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer variant="default" />
    </div>
  );
}
