import React from "react";
import { Facebook, Linkedin, Twitter } from "lucide-react";
import { Link } from "@/component/lib/router";

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-logo">
          <h2>ByteHive</h2>
          <p className="footer-tagline">Buzzing place for campus food</p>
          <p className="footer-copy">
            Helping students and faculty discover and order food easily across campus
          </p>
        </div>

        <div className="footer-links">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/" className="footer-nav-link">Home</Link></li>
            <li><Link to="/canteens" className="footer-nav-link">Explore Canteens</Link></li>
            <li><Link to="/#popular" className="footer-nav-link">Popular</Link></li>
            <li><Link to="/about" className="footer-nav-link">About Us</Link></li>
            <li><Link to="/#about" className="footer-nav-link">Contact / Help</Link></li>
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
