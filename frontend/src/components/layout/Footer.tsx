import React from "react";
import "./Footer.css";

const Footer: React.FC = () => {
  return (
    <footer className="footer">

      <div className="footer-container">

        {/* Logo Section */}
        <div className="footer-logo">
          <span className="logo-box">B</span>
          <h2>ByteHive</h2>
          <p>Your campus food companion.</p>
        </div>

        {/* Quick Links */}
        <div className="footer-links">
          <h3>Quick Links</h3>
          <ul>
            <li>Home</li>
            <li>Popular</li>
            <li>About</li>
            <li>Contact</li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="footer-contact">
          <h3>Contact</h3>
          <p>Email: support@bytehive.com</p>
          <p>Phone: +91 9876543210</p>
          <p>Location: Campus Canteen</p>
        </div>

      </div>

      {/* Bottom Line */}
      <div className="footer-bottom">
        <p>© 2026 ByteHive. All rights reserved.</p>
      </div>

    </footer>
  );
};

export default Footer;