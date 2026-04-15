import React from "react";
import { Facebook, Linkedin, Twitter } from "lucide-react";
import { Link } from "@/components/lib/router";
import { getVendorOutletId } from "@/features/vendor/services/vendor-portal.service";

type FooterProps = {
  variant?: "default" | "vendor";
};

const Footer: React.FC<FooterProps> = ({ variant = "default" }) => {
  const vendorOutletId = variant === "vendor" && typeof window !== "undefined" ? getVendorOutletId() : "";
  const quickLinks = variant === "vendor"
    ? [
        { label: "Dashboard", to: "/vendor/dashboard" },
        { label: "Guidance", to: "/vendor/guidance" },
        ...(vendorOutletId ? [{ label: "Preview", to: `/canteens/${vendorOutletId}?preview=vendor&src=footer` }] : []),
        { label: "About Us", to: "/vendor/about" },
      ]
    : [
        { label: "Home", to: "/" },
        { label: "Explore Canteens", to: "/canteens" },
        { label: "Popular", to: "/#popular" },
        { label: "About Us", to: "/about" },
        { label: "Contact / Help", to: "/#about" },
      ];

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-logo">
          <h2>ByteHive</h2>
          <p className="footer-tagline">{variant === "vendor" ? "Operating the campus food network" : "Buzzing place for campus food"}</p>
          <p className="footer-copy">
            {variant === "vendor"
              ? "Helping outlet teams manage guidance, previews, and live service operations across campus"
              : "Helping students and faculty discover and order food easily across campus"}
          </p>
        </div>

        <div className="footer-links">
          <h3>Quick Links</h3>
          <ul>
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="footer-nav-link">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-contact">
          <h3>Contact & Social</h3>
          <p>foodexample@gmail.com</p>
          <div className="footer-socials" aria-label="Social links">
            <a href="#" aria-label="LinkedIn" className="footer-social-link">
              <Linkedin size={16} />
            </a>
            <a href="#" aria-label="Twitter" className="footer-social-link">
              <Twitter size={16} />
            </a>
            <a href="#" aria-label="Facebook" className="footer-social-link">
              <Facebook size={16} />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 ByteHive. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
