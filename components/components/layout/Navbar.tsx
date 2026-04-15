import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { Link, useLocation } from "@/components/lib/router";
import { getVendorOutlet, getVendorOutletId } from "@/features/vendor/services/vendor-portal.service";
import { QRCodeSVG } from "qrcode.react";
import useAuth from "@/features/auth/hooks/useAuth";
import AuthModal from "@/features/auth/components/AuthModal";
import PortalDropdown from "@/features/auth/components/PortalDropdown";
import ProfileHub from "@/features/auth/components/ProfileHub";
import StudentLoginModal from "@/features/auth/components/StudentLoginModal";
import {
  getActiveOrdersForUser,
  getOrderDelayCopy,
  getQrValueForOrder,
  setCurrentUserSession,
  subscribeToAuthPrompt,
  subscribeToOrders,
  updateOrderStatus,
  type ByteHiveOrder,
  type UserRole,
} from "@/features/orders/services/order-portal.service";

type AuthRole = UserRole;
type PendingAuthRole = "student" | "faculty" | null;

const READY_PROMPT_KEY = "bytehiveReadyPromptState";
const DELAY_PROMPT_KEY = "bytehiveDelayPromptState";

function readPromptState(key: string) {
  if (typeof window === "undefined") return {} as Record<string, string>;

  try {
    if (typeof (globalThis as any).localStorage !== "undefined" && typeof (globalThis as any).localStorage.getItem === "function") {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as Record<string, string>) : {};
    }
    return {};
  } catch {
    return {};
  }
}

function savePromptState(key: string, state: Record<string, string>) {
  if (typeof window === "undefined") return;

  try {
    if (typeof (globalThis as any).localStorage !== "undefined" && typeof (globalThis as any).localStorage.setItem === "function") {
      localStorage.setItem(key, JSON.stringify(state));
    }
  } catch {
  }
}

interface NavbarProps {
  isVendorPreview?: boolean;
  previewOutletId?: string | null;
}

const Navbar: React.FC<NavbarProps> = ({ isVendorPreview = false, previewOutletId = null }) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAuthRole, setPendingAuthRole] = useState<PendingAuthRole>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [readyOrderPrompt, setReadyOrderPrompt] = useState<ByteHiveOrder | null>(null);
  const [handoffPrompt, setHandoffPrompt] = useState<ByteHiveOrder | null>(null);
  const [delayedOrderPrompt, setDelayedOrderPrompt] = useState<ByteHiveOrder | null>(null);
  const { user, authRole, signIn, signUp, logout } = useAuth();

  const location = useLocation();
  const blockDropdownRef = useRef<HTMLDivElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLButtonElement>(null);
  const userName = guestMode ? "Guest User" : user?.displayName || user?.email?.split("@")[0] || "Student Name";
  const isVendorRoute = location.pathname.startsWith("/vendor") || isVendorPreview;
  const showPrimaryNav = !isVendorRoute;
  const isAuthenticated = guestMode || !!user;
  const showUserProfileControls = !isVendorRoute && isAuthenticated;

  const blockLinks: Array<{ label: string; to: string; sublabel?: string }> = useMemo(
    () => [
      { label: "Block A", to: "/canteens?filter=Block A" },
      { label: "Block B", to: "/canteens?filter=Block B" },
      { label: "Dominos", to: "/canteens?filter=Dominos" },
    ],
    []
  );

  const vendorOutletId = previewOutletId ?? (typeof window !== "undefined" ? getVendorOutletId() : undefined);

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
    if (typeof window === "undefined") return;

    try {
      if (typeof (globalThis as any).localStorage !== "undefined" && typeof (globalThis as any).localStorage.getItem === "function") {
        const stored = localStorage.getItem("theme");
        if (stored === "light" || stored === "dark") setTheme(stored);
      }
    } catch {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.setAttribute("data-theme", theme);
    body.classList.remove("light", "dark");
    body.classList.add(theme);

    try {
      if (typeof (globalThis as any).localStorage !== "undefined" && typeof (globalThis as any).localStorage.setItem === "function") {
        localStorage.setItem("theme", theme);
      }
    } catch {
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
    const timeout = window.setTimeout(() => {
      setIsMenuOpen(false);
      setIsBlockOpen(false);
      setIsPortalOpen(false);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (user) {
      const timeout = window.setTimeout(() => setGuestMode(false), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [user]);

  useEffect(() => {
    const syncOrders = () => {
      if (guestMode || !authRole || !userName) {
        setHasActiveOrder(false);
        setReadyOrderPrompt(null);
        setHandoffPrompt(null);
        setDelayedOrderPrompt(null);
        return;
      }

      const activeOrders = getActiveOrdersForUser(userName);
      setHasActiveOrder(activeOrders.length > 0);

      if (location.pathname.startsWith("/vendor")) {
        setReadyOrderPrompt(null);
        setHandoffPrompt(null);
        setDelayedOrderPrompt(null);
        return;
      }

      const readyPromptState = readPromptState(READY_PROMPT_KEY);
      const delayPromptState = readPromptState(DELAY_PROMPT_KEY);
      const latestHandoffOrder = activeOrders.find((order) => order.status === "handoff") ?? null;
      const latestReadyOrder = activeOrders.find((order) => order.status === "ready") ?? null;
      const latestDelayedOrder = activeOrders.find((order) => order.delayState === "delayed") ?? null;

      if (
        latestHandoffOrder &&
        readyPromptState[latestHandoffOrder.id] !== latestHandoffOrder.updatedAt
      ) {
        setHandoffPrompt(latestHandoffOrder);
      } else if (!latestHandoffOrder) {
        setHandoffPrompt(null);
      }

      if (
        latestReadyOrder &&
        readyPromptState[latestReadyOrder.id] !== latestReadyOrder.updatedAt &&
        (!latestHandoffOrder || latestHandoffOrder.id !== latestReadyOrder.id)
      ) {
        setReadyOrderPrompt(latestReadyOrder);
      } else if (!latestReadyOrder || latestHandoffOrder?.id === latestReadyOrder.id) {
        setReadyOrderPrompt(null);
      }

      if (
        latestDelayedOrder &&
        delayPromptState[latestDelayedOrder.id] !== latestDelayedOrder.updatedAt
      ) {
        setDelayedOrderPrompt(latestDelayedOrder);
      } else if (!latestDelayedOrder) {
        setDelayedOrderPrompt(null);
      }
    };

    syncOrders();
    return subscribeToOrders(syncOrders);
  }, [authRole, guestMode, location.pathname, userName]);

  useEffect(() => {
    return subscribeToAuthPrompt((detail) => {
      setIsPortalOpen(false);
      setIsMenuOpen(false);

      if (detail.reason === "upgrade-guest" && guestMode) {
        setGuestMode(false);
      }

      setPendingAuthRole(detail.role ?? "student");
      setIsLoginModalOpen(true);
    });
  }, [guestMode]);

  useEffect(() => {
    if (guestMode) {
      setCurrentUserSession({ authRole: "guest", userName: "Guest User" });
    } else if (authRole && user) {
      setCurrentUserSession({ authRole, userName });
    } else {
      setCurrentUserSession(null);
    }
  }, [authRole, guestMode, user, userName]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const openAuthFlow = (role: "student" | "faculty") => {
    setPendingAuthRole(role);
    setIsAuthModalOpen(true);
    setIsLoginModalOpen(false);
  };

  const handleAuthSubmit = async ({
    role,
    mode,
    name,
    email,
    password,
  }: {
    role: "student" | "faculty";
    mode: "login" | "signup";
    name: string;
    email: string;
    password: string;
  }) => {
    if (mode === "signup") {
      await signUp({ role, name, email, password });
    } else {
      await signIn({ role, email, password });
    }

    setGuestMode(false);
    setIsPortalOpen(false);
    setIsMenuOpen(false);
    setIsProfileOpen(true);
  };

  const handleLogout = async () => {
    if (guestMode) {
      setGuestMode(false);
      setPendingAuthRole(null);
      setIsProfileOpen(false);
      return;
    }

    await logout();
    setPendingAuthRole(null);
    setIsProfileOpen(false);
    setReadyOrderPrompt(null);
    setHandoffPrompt(null);
  };

  const handleReadyPromptDismiss = () => {
    if (!readyOrderPrompt) return;
    savePromptState(READY_PROMPT_KEY, {
      ...readPromptState(READY_PROMPT_KEY),
      [readyOrderPrompt.id]: readyOrderPrompt.updatedAt,
    });
    setReadyOrderPrompt(null);
  };

  const handleHandoffPromptDismiss = () => {
    if (!handoffPrompt) return;
    savePromptState(READY_PROMPT_KEY, {
      ...readPromptState(READY_PROMPT_KEY),
      [handoffPrompt.id]: handoffPrompt.updatedAt,
    });
    setHandoffPrompt(null);
  };

  const handleOrderPicked = () => {
    if (!handoffPrompt) return;
    updateOrderStatus(handoffPrompt.id, "collected");
    savePromptState(READY_PROMPT_KEY, {
      ...readPromptState(READY_PROMPT_KEY),
      [handoffPrompt.id]: handoffPrompt.updatedAt,
    });
    setHandoffPrompt(null);
  };

  const handleDelayPromptDismiss = () => {
    if (!delayedOrderPrompt) return;
    savePromptState(DELAY_PROMPT_KEY, {
      ...readPromptState(DELAY_PROMPT_KEY),
      [delayedOrderPrompt.id]: delayedOrderPrompt.updatedAt,
    });
    setDelayedOrderPrompt(null);
  };

  const isDarkMode = theme === "dark";
  const isGuest = guestMode;
  const displayRole: AuthRole = authRole ?? "student";

  return (
    <>
      <nav className="navbar">
        <Link to={isVendorRoute ? "/vendor/dashboard" : "/"} className="navbar-logo" aria-label="ByteHive home">
          <span className="logo-box">
            <img src="/images/bytehive-navbar-logo.png" alt="ByteHive logo" className="logo-box-image" />
          </span>
          <span className="logo-text">ByteHive</span>
        </Link>

        <div className={`navbar-menu ${isMenuOpen ? "navbar-menu-open" : ""}`}>
          {showPrimaryNav && <Link to="/" className="nav-link">Home</Link>}
          {showPrimaryNav && <Link to="/#popular" className="nav-link">Popular</Link>}
          {isVendorRoute && <Link to="/vendor/dashboard" className="nav-link">Dashboard</Link>}
          {isVendorRoute && <Link to="/vendor/guidance" className="nav-link">Guidance</Link>}
          {isVendorRoute && vendorOutletId && (
            <Link to={`/canteens/${vendorOutletId}?preview=vendor&src=navbar`} className="nav-link">Preview</Link>
          )}
          <Link to={isVendorRoute ? "/vendor/about" : "/about"} className="nav-link">About Us</Link>

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
          )}

          {!isVendorRoute && !isAuthenticated && (
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
            <div className="ready-order-qr-shell">
              <div className="ready-order-qr-box">
                <QRCodeSVG value={getQrValueForOrder(readyOrderPrompt)} size={180} level="H" />
              </div>
              <strong>Pickup code: {readyOrderPrompt.pickupCode}</strong>
              <small>{getQrValueForOrder(readyOrderPrompt)}</small>
            </div>
            <div className="ready-order-actions">
              <button type="button" className="ready-order-secondary" onClick={handleReadyPromptDismiss}>Close</button>
            </div>
          </div>
        </div>
      )}

      {handoffPrompt && (
        <div className="ready-order-modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm order pickup">
          <div className="ready-order-modal">
            <h3>Counter verification complete</h3>
            <p>
              {handoffPrompt.outletName} has verified your QR for order #{handoffPrompt.id}. Did you receive your order?
            </p>
            <div className="ready-order-actions">
              <button type="button" className="ready-order-secondary" onClick={handleHandoffPromptDismiss}>No, not yet</button>
              <button type="button" className="ready-order-primary" onClick={handleOrderPicked}>Yes, order picked</button>
            </div>
          </div>
        </div>
      )}

      {delayedOrderPrompt && (
        <div className="delay-order-toast" role="status" aria-live="assertive">
          <div className="delay-order-toast-copy">
            <strong>Your order is delayed</strong>
            <p>
              Order #{delayedOrderPrompt.id} from {delayedOrderPrompt.outletName} has been delayed.
              {getOrderDelayCopy(delayedOrderPrompt) ? ` ${getOrderDelayCopy(delayedOrderPrompt)}` : ""}
            </p>
          </div>
          <button type="button" className="delay-order-toast-close" onClick={handleDelayPromptDismiss}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
};

export default Navbar;
