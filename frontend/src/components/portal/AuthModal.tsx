import { GraduationCap, LogIn, ShieldCheck, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./AuthModal.css";

type AuthRole = "student" | "faculty";
type AuthMode = "login" | "signup";

type AuthModalProps = {
  isOpen: boolean;
  role: AuthRole;
  onClose: () => void;
  onSubmit: (payload: { role: AuthRole; mode: AuthMode; name: string; email: string }) => void;
};

function AuthModal({ isOpen, role, onClose, onSubmit }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setMode("login");
      setName("");
      setEmail("");
      setPassword("");
    }
  }, [isOpen]);

  const roleLabel = useMemo(() => (role === "student" ? "Student" : "Faculty"), [role]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      role,
      mode,
      name: mode === "signup" ? (name.trim() || `${roleLabel} Name`) : `${roleLabel} Name`,
      email: email.trim(),
    });
    onClose();
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close authentication modal">
          <X size={20} />
        </button>

        <div className="auth-modal-header">
          <span className="auth-modal-badge">{roleLabel} Portal</span>
          <h2>{mode === "login" ? `Login as ${roleLabel}` : `Sign up as ${roleLabel}`}</h2>
          <p>Continue to your ByteHive meals, orders, and favorites.</p>
        </div>

        <div className="auth-modal-switcher">
          <button
            type="button"
            className={mode === "login" ? "auth-switch-active" : ""}
            onClick={() => setMode("login")}
          >
            <LogIn size={16} />
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "auth-switch-active" : ""}
            onClick={() => setMode("signup")}
          >
            <UserPlus size={16} />
            Sign Up
          </button>
        </div>

        <form className="auth-modal-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Full Name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder={`${roleLabel} Name`} required />
            </label>
          )}

          <label>
            College Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={role === "student" ? "student@college.edu" : "faculty@college.edu"}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
            />
          </label>

          <button type="submit" className="auth-modal-submit">
            {mode === "login" ? (
              <>
                {role === "student" ? <GraduationCap size={18} /> : <ShieldCheck size={18} />}
                Continue to {roleLabel} Portal
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create {roleLabel} Account
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
