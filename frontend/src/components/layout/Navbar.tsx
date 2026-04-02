import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import PortalDropdown from "../portal/PortalDropdown";
import ProfileHub from "../portal/ProfileHub";
import StudentLoginModal from "../portal/StudentLoginModal";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch (error) {
      console.error("Unable to read stored theme:", error);
    }

    return "light";
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"student" | "faculty">("student");
  const [userName, setUserName] = useState("Student Name");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasActiveOrder] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

  const location = useLocation();
  const blockDropdownRef = useRef<HTMLDivElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLButtonElement>(null);

  const blockLinks = useMemo(
    () => [
      { label: "Block A", sublabel: "Punjabi Bites", to: "/menu/punjabiBites" },
      { label: "Block B", sublabel: "Rolls Lane", to: "/menu/rollsLane" },
      { label: "Block C", sublabel: "Taste of Delhi", to: "/menu/tasteOfDelhi" },
      { label: "Block D", sublabel: "Cafe Coffee Day", to: "/menu/cafeCoffeeDay" },
      { label: "Block E", sublabel: "Amritsari Haveli", to: "/menu/AmritsarHaveli" },
    ],
    []
  );

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute("data-theme", theme);
    body.classList.remove("light", "dark");
    body.classList.add(theme);

    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      console.error("Unable to save theme:", error);
    }
  }, [theme]);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 860);

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (blockDropdownRef.current && !blockDropdownRef.current.contains(target)) {
        setIsBlockOpen(false);
      }

      if (portalDropdownRef.current && !portalDropdownRef.current.contains(target)) {
        setIsPortalOpen(false);
      }

      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        return;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsBlockOpen(false);
    setIsPortalOpen(false);
  }, [location.pathname, location.hash]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const handlePortalLogin = (role: "student" | "faculty") => {
    setIsAuthenticated(true);
    setUserRole(role);
    setUserName(role === "student" ? "Student Name" : "Faculty Name");
    setIsPortalOpen(false);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole("student");
    setUserName("Student Name");
    setIsProfileOpen(false);
  };

  const isDarkMode = theme === "dark";

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-logo" aria-label="ByteHive home">
          <span className="logo-box">
            <img src="/images/bytehive-navbar-logo.png" alt="ByteHive logo" className="logo-box-image" />
          </span>
          <span className="logo-text">ByteHive</span>
        </Link>

        <div className={`navbar-menu ${isMenuOpen ? "navbar-menu-open" : ""}`}>
          <Link to="/" className="nav-link">
            Home
          </Link>

          <Link to="/#popular" className="nav-link">
            Popular
          </Link>

          <Link to="/about" className="nav-link">
            About Us
          </Link>

          <div className="nav-dropdown" ref={blockDropdownRef}>
            <button
              type="button"
              className={`nav-link nav-dropdown-toggle ${isBlockOpen ? "nav-dropdown-active" : ""}`}
              onClick={() => {
                setIsBlockOpen((open) => !open);
                setIsPortalOpen(false);
              }}
              aria-expanded={isBlockOpen}
            >
              <span>Block</span>
              <ChevronDown size={18} className={`nav-chevron ${isBlockOpen ? "nav-chevron-open" : ""}`} />
            </button>

            <div className={`nav-dropdown-panel ${isBlockOpen ? "nav-dropdown-panel-open" : ""}`}>
              {blockLinks.map((item) => (
                <Link key={item.to} to={item.to} className="nav-dropdown-item">
                  <span className="nav-dropdown-badge">{item.label.replace("Block ", "")}</span>
                  <span className="nav-dropdown-copy">
                    <strong>{item.label}</strong>
                    <small>{item.sublabel}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {!isAuthenticated && (
            <div className="nav-dropdown" ref={portalDropdownRef}>
              <button
                type="button"
                className={`nav-link nav-dropdown-toggle ${isPortalOpen ? "nav-dropdown-active" : ""}`}
                onClick={() => {
                  setIsPortalOpen((open) => !open);
                  setIsBlockOpen(false);
                }}
                aria-expanded={isPortalOpen}
              >
                <span>Portal</span>
                <ChevronDown size={18} className={`nav-chevron ${isPortalOpen ? "nav-chevron-open" : ""}`} />
              </button>

              <PortalDropdown
                isOpen={isPortalOpen}
                onClose={() => setIsPortalOpen(false)}
                onOpenStudentLogin={() => setIsLoginModalOpen(true)}
              />
            </div>
          )}
        </div>

        <div className="navbar-actions">
          {isAuthenticated && (
            <button
              type="button"
              ref={profileDropdownRef}
              className="profile-avatar-btn"
              onClick={() => setIsProfileOpen((open) => !open)}
              title={hasActiveOrder ? "1 active order - Tap to view" : "View Profile"}
              aria-label="Open profile hub"
            >
              {userName.charAt(0).toUpperCase()}
              {hasActiveOrder && <span className="profile-avatar-pulse" />}
            </button>
          )}

          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>

          <button
            type="button"
            className="menu-toggle"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <StudentLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handlePortalLogin}
      />

      <ProfileHub
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onLogout={handleLogout}
        userName={userName}
        userRole={userRole}
        isMobile={isMobileView}
        hasActiveOrder={hasActiveOrder}
      />
    </>
  );
};

export default Navbar;
