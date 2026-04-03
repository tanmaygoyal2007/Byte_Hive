import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import AuthModal from "../portal/AuthModal";
import PortalDropdown from "../portal/PortalDropdown";
import ProfileHub from "../portal/ProfileHub";
import StudentLoginModal from "../portal/StudentLoginModal";
import "./Navbar.css";

type AuthRole = "student" | "faculty" | "guest";
type PendingAuthRole = "student" | "faculty" | null;

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAuthRole, setPendingAuthRole] = useState<PendingAuthRole>(null);
  const [authRole, setAuthRole] = useState<AuthRole | null>(null);
  const [userName, setUserName] = useState("Student Name");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasActiveOrder] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

  const location = useLocation();
  const blockDropdownRef = useRef<HTMLDivElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLButtonElement>(null);

  const blockLinks: Array<{ label: string; to: string; sublabel?: string }> = useMemo(
    () => [
      { label: "Block A", to: "/explore?filter=Block A" },
      { label: "Block B", to: "/explore?filter=Block B" },
      { label: "Dominos", to: "/explore?filter=Dominos" },
    ],
    []
  );

  const renderDropdownIcon = (item: { label: string; to: string }) => {
    if (item.label === "Dominos") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="nav-dropdown-icon-svg"
          fill="currentColor"
        >
          <path d="M17.171 15.601c-.134 0-.262-.054-.356-.149L8.736 7.27c-.192-.194-.192-.507 0-.702l5.743-5.827c.943-.955 2.591-.955 3.534 0l5.258 5.324c.969.982.969 2.579 0 3.561l-5.744 5.827C17.434 15.547 17.305 15.601 17.171 15.601zM9.794 6.918l7.377 7.471 5.389-5.466c.587-.595.587-1.562 0-2.156l-5.258-5.324c-.564-.572-1.546-.572-2.11 0L9.794 6.918zM7.748 24.001c-.618 0-1.236-.231-1.719-.694l-5.291-5.075c-.979-.991-.979-2.588-.01-3.57l6.147-6.23c.188-.19.523-.19.712 0l8.08 8.182c.094.095.146.224.144.357-.001.134-.057.261-.153.354l-6.185 5.974C8.991 23.767 8.369 24.001 7.748 24.001zM7.232 9.495l-5.792 5.87c0 0 0 0 0 0-.587.594-.587 1.561 0 2.155l5.281 5.065c.578.555 1.482.553 2.058-.005l5.821-5.623L7.232 9.495zM1.084 15.014h.01H1.084z"></path>
          <path d="M10.251 18.5c-1.104 0-2.001-.896-2.001-1.999 0-1.104.897-2.001 2-2.001.536 0 1.039.208 1.417.587.377.378.584.88.583 1.415.002.53-.204 1.032-.579 1.409C11.292 18.291 10.788 18.5 10.251 18.5zM10.25 15.5c-.551 0-1 .449-1 1.001 0 .551.449.999 1.001.999.269 0 .522-.105.711-.295.187-.188.289-.437.288-.702 0-.27-.103-.521-.291-.709C10.77 15.604 10.518 15.5 10.25 15.5zM5.001 18.5C3.897 18.5 3 17.604 3 16.501 3 15.398 3.897 14.5 5 14.5c.536 0 1.039.208 1.417.587.377.378.584.88.583 1.415.002.53-.204 1.032-.579 1.409C6.042 18.291 5.538 18.5 5.001 18.5zM5 15.5c-.551 0-1 .449-1 1.001C4 17.052 4.449 17.5 5.001 17.5c.269 0 .522-.105.711-.295C5.899 17.018 6.001 16.769 6 16.503c0-.27-.103-.521-.291-.709C5.52 15.604 5.268 15.5 5 15.5zM16.501 9.5c-1.104 0-2.001-.896-2.001-1.999 0-1.104.897-2.001 2-2.001.536 0 1.039.208 1.417.587.377.378.584.88.583 1.415.002.53-.204 1.032-.579 1.409C17.542 9.291 17.038 9.5 16.501 9.5zM16.5 6.5c-.551 0-1 .449-1 1.001 0 .551.449.999 1.001.999.269 0 .522-.105.711-.295.187-.188.289-.437.288-.702 0-.27-.103-.521-.291-.709C17.02 6.604 16.768 6.5 16.5 6.5z"></path>
        </svg>
      );
    }
    return item.label.replace("Block ", "");
  };

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

  const openAuthFlow = (role: "student" | "faculty") => {
    setPendingAuthRole(role);
    setIsAuthModalOpen(true);
    setIsLoginModalOpen(false);
  };

  const handleGuestContinue = () => {
    setAuthRole("guest");
    setUserName("Guest User");
    setIsPortalOpen(false);
    setIsMenuOpen(false);
    setIsProfileOpen(true);
  };

  const handleAuthSubmit = ({ role, name }: { role: "student" | "faculty"; mode: "login" | "signup"; name: string; email: string }) => {
    setAuthRole(role);
    setUserName(name || (role === "student" ? "Student Name" : "Faculty Name"));
    setIsPortalOpen(false);
    setIsMenuOpen(false);
    setIsProfileOpen(true);
  };

  const handleLogout = () => {
    setAuthRole(null);
    setUserName("Student Name");
    setPendingAuthRole(null);
    setIsProfileOpen(false);
  };

  const isDarkMode = theme === "dark";
  const isAuthenticated = authRole !== null;
  const isGuest = authRole === "guest";
  const displayRole: AuthRole = authRole ?? "student";

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
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/#popular" className="nav-link">Popular</Link>
          <Link to="/about" className="nav-link">About Us</Link>

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

            <div className={`dropdown-menu ${isBlockOpen ? "dropdown-menu-open" : ""}`}>
              {blockLinks.map((item) => (
                <Link key={item.to} to={item.to} className="dropdown-item">
                  <span className="block-icon">{renderDropdownIcon(item)}</span>
                  <div className="item-text">
                    <strong>{item.label}</strong>
                    {item.sublabel && <small>{item.sublabel}</small>}
                  </div>
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
        onChooseRole={openAuthFlow}
        onContinueAsGuest={handleGuestContinue}
      />

      {pendingAuthRole && (
        <AuthModal
          isOpen={isAuthModalOpen}
          role={pendingAuthRole}
          onClose={() => setIsAuthModalOpen(false)}
          onSubmit={handleAuthSubmit}
        />
      )}

      <ProfileHub
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onLogout={handleLogout}
        onRequestAuth={(role = "student") => openAuthFlow(role)}
        userName={userName}
        userRole={displayRole}
        isGuest={isGuest}
        isMobile={isMobileView}
        hasActiveOrder={hasActiveOrder}
      />
    </>
  );
};

export default Navbar;
