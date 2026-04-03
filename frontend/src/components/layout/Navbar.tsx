import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import AuthModal from "../portal/AuthModal";
import PortalDropdown from "../portal/PortalDropdown";
import ProfileHub from "../portal/ProfileHub";
import StudentLoginModal from "../portal/StudentLoginModal";
import {
  getActiveOrdersForUser,
  getCurrentUserSession,
  setCurrentUserSession,
  subscribeToAuthPrompt,
  subscribeToOrders,
  subscribeToUserSession,
  updateOrderStatus,
  type ByteHiveOrder,
  type UserRole,
} from "../../utils/orderPortal";
import "./Navbar.css";

type AuthRole = UserRole;
type PendingAuthRole = "student" | "faculty" | null;

const READY_PROMPT_KEY = "bytehiveReadyPromptState";

function readReadyPromptState() {
  if (typeof window === "undefined") return {} as Record<string, string>;

  try {
    const stored = localStorage.getItem(READY_PROMPT_KEY);
    return stored ? JSON.parse(stored) as Record<string, string> : {};
  } catch {
    return {};
  }
}

function saveReadyPromptState(state: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(READY_PROMPT_KEY, JSON.stringify(state));
}

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
  const [authRole, setAuthRole] = useState<AuthRole | null>(() => getCurrentUserSession()?.authRole ?? null);
  const [userName, setUserName] = useState(() => getCurrentUserSession()?.userName ?? "Student Name");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [readyOrderPrompt, setReadyOrderPrompt] = useState<ByteHiveOrder | null>(null);

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
      if (blockDropdownRef.current && !blockDropdownRef.current.contains(target)) setIsBlockOpen(false);
      if (portalDropdownRef.current && !portalDropdownRef.current.contains(target)) setIsPortalOpen(false);
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) return;
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsBlockOpen(false);
    setIsPortalOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const syncSession = () => {
      const session = getCurrentUserSession();
      setAuthRole(session?.authRole ?? null);
      setUserName(session?.userName ?? "Student Name");
    };

    syncSession();
    return subscribeToUserSession(syncSession);
  }, []);

  useEffect(() => {
    const syncOrders = () => {
      if (!authRole || !userName || authRole === "guest") {
        setHasActiveOrder(false);
        setReadyOrderPrompt(null);
        return;
      }

      const activeOrders = getActiveOrdersForUser(userName);
      setHasActiveOrder(activeOrders.length > 0);

      const latestReadyOrder = !location.pathname.startsWith("/vendor")
        ? activeOrders.find((order) => order.status === "ready") ?? null
        : null;
      if (!latestReadyOrder) {
        setReadyOrderPrompt(null);
        return;
      }

      const promptState = readReadyPromptState();
      if (promptState[latestReadyOrder.id] === latestReadyOrder.updatedAt) {
        return;
      }

      setReadyOrderPrompt(latestReadyOrder);
    };

    syncOrders();
    return subscribeToOrders(syncOrders);
  }, [authRole, userName]);

  useEffect(() => {
    return subscribeToAuthPrompt((detail) => {
      setIsPortalOpen(false);
      setIsMenuOpen(false);

      if (detail.reason === "upgrade-guest" && authRole === "guest") {
        setAuthRole(null);
      }

      setPendingAuthRole(detail.role ?? "student");
      setIsLoginModalOpen(true);
    });
  }, [authRole]);

  useEffect(() => {
    if (authRole) {
      setCurrentUserSession({ authRole, userName });
    } else {
      setCurrentUserSession(null);
    }
  }, [authRole, userName]);

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
    setReadyOrderPrompt(null);
  };

  const handleReadyPromptDismiss = () => {
    if (!readyOrderPrompt) return;
    saveReadyPromptState({
      ...readReadyPromptState(),
      [readyOrderPrompt.id]: readyOrderPrompt.updatedAt,
    });
    setReadyOrderPrompt(null);
  };

  const handleOrderPicked = () => {
    if (!readyOrderPrompt) return;
    updateOrderStatus(readyOrderPrompt.id, "collected");
    saveReadyPromptState({
      ...readReadyPromptState(),
      [readyOrderPrompt.id]: readyOrderPrompt.updatedAt,
    });
    setReadyOrderPrompt(null);
  };

  const isDarkMode = theme === "dark";
  const isAuthenticated = authRole !== null;
  const isGuest = authRole === "guest";
  const displayRole: AuthRole = authRole ?? "student";
  const isVendorRoute = location.pathname.startsWith("/vendor");
  const showPrimaryNav = !isVendorRoute;
  const showUserProfileControls = !isVendorRoute && isAuthenticated;

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
          {showPrimaryNav && <Link to="/" className="nav-link">Home</Link>}
          {showPrimaryNav && <Link to="/#popular" className="nav-link">Popular</Link>}
          <Link to="/about" className="nav-link">About Us</Link>

          {showPrimaryNav && (
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
          )}

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
          {showUserProfileControls && (
            <button
              type="button"
              ref={profileDropdownRef}
              className="profile-avatar-btn"
              onClick={() => setIsProfileOpen((open) => !open)}
              title={hasActiveOrder ? "Active order in progress" : "View Profile"}
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

      {!isVendorRoute && (
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
      )}

      {readyOrderPrompt && (
        <div className="ready-order-modal-backdrop" role="dialog" aria-modal="true" aria-label="Order ready for pickup">
          <div className="ready-order-modal">
            <h3>Your order is ready</h3>
            <p>
              Order #{readyOrderPrompt.id} from {readyOrderPrompt.outletName} is ready for pickup at {readyOrderPrompt.pickupLocation}.
            </p>
            <div className="ready-order-actions">
              <button type="button" className="ready-order-secondary" onClick={handleReadyPromptDismiss}>No, not yet</button>
              <button type="button" className="ready-order-primary" onClick={handleOrderPicked}>Yes, order picked</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
