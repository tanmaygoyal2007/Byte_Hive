"use client";

import { ShieldX, Sparkles } from "lucide-react";
import { Link } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import "@/app/not-found.css";

function UnauthorizedVendorPage() {
  return (
    <div className="not-found-wrapper">
      <Navbar forceUserMode />

      <main className="not-found-container">
        <div className="not-found-content">
          <div className="unauthorized-badge">
            <ShieldX size={18} />
            Access Denied
          </div>

          <div className="unauthorized-illustration">
            <div className="unauthorized-plate">
              <div className="unauthorized-plate-inner">
                <ShieldX size={56} strokeWidth={1.5} />
              </div>
              <div className="unauthorized-plate-rim"></div>
            </div>
            <div className="unauthorized-sparkles">
              <Sparkles className="sparkle sparkle-1" size={16} aria-hidden="true" />
              <Sparkles className="sparkle sparkle-2" size={16} aria-hidden="true" />
              <Sparkles className="sparkle sparkle-3" size={16} aria-hidden="true" />
              <Sparkles className="sparkle sparkle-4" size={16} aria-hidden="true" />
            </div>
          </div>

          <div className="not-found-text">
            <h1 className="unauthorized-title">403</h1>
            <h2 className="unauthorized-subtitle">You don&apos;t have permission</h2>
            <p className="not-found-description">
              Please login or sign up as a vendor to access this page. If you believe this is an error, contact support.
            </p>
          </div>

          <div className="not-found-actions">
            <Link to="/vendor/login" className="not-found-btn not-found-btn-primary">
              Login / Sign Up
            </Link>
            <Link to="/" className="not-found-btn not-found-btn-secondary">
              Go to Homepage
            </Link>
          </div>

          <div className="not-found-features">
            <div className="not-found-feature">
              <div className="not-found-feature-icon">
                <ShieldX size={22} />
              </div>
              <div className="not-found-feature-content">
                <span className="not-found-feature-title">Restricted Area</span>
                <span className="not-found-feature-desc">Vendor portal access only</span>
              </div>
            </div>
            <div className="not-found-feature">
              <div className="not-found-feature-icon">
                <ShieldX size={22} />
              </div>
              <div className="not-found-feature-content">
                <span className="not-found-feature-title">Need Help?</span>
                <span className="not-found-feature-desc">Contact support team</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default UnauthorizedVendorPage;
