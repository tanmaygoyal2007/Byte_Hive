import { GraduationCap, LogIn, ShieldCheck, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./AuthModal.css";

type AuthRole = "student" | "faculty";
type AuthMode = "login" | "signup";

type AuthModalProps = {
  isOpen: boolean;
  role: AuthRole;
  onClose: () => void;
  onSubmit: (payload: { role: AuthRole; mode: AuthMode; name: string; email: string; password: string }) => Promise<void>;
};

const SAVED_EMAILS_KEY = "bytehive-saved-auth-emails";
const REQUIRED_EMAIL_SUFFIX = ".christuniversity.in";

function getCollegeEmailMessage(roleLabel: string) {
  return `Use your ${roleLabel.toLowerCase()} college email.`;
}

function readSavedEmails() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const stored = localStorage.getItem(SAVED_EMAILS_KEY);
    return stored ? JSON.parse(stored) as string[] : [];
  } catch {
    return [];
  }
}

function saveRememberedEmail(email: string) {
  if (typeof window === "undefined") return;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const nextEmails = [normalizedEmail, ...readSavedEmails().filter((entry) => entry !== normalizedEmail)].slice(0, 8);
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(nextEmails));
}

function AuthModal({ isOpen, role, onClose, onSubmit }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedEmails, setSavedEmails] = useState<string[]>([]);

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
      setIsSubmitting(false);
      setErrorMessage("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSavedEmails(readSavedEmails());
  }, [isOpen]);

  const roleLabel = useMemo(() => (role === "student" ? "Student" : "Faculty"), [role]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith(REQUIRED_EMAIL_SUFFIX)) {
      setIsSubmitting(false);
      setErrorMessage(getCollegeEmailMessage(roleLabel));
      return;
    }

    try {
      await onSubmit({
        role,
        mode,
        name: mode === "signup" ? (name.trim() || `${roleLabel} Name`) : `${roleLabel} Name`,
        email: normalizedEmail,
        password,
      });
      saveRememberedEmail(normalizedEmail);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
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
            onClick={() => {
              setMode("login");
              setErrorMessage("");
            }}
          >
            <LogIn size={16} />
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "auth-switch-active" : ""}
            onClick={() => {
              setMode("signup");
              setErrorMessage("");
            }}
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
              placeholder={role === "student" ? `student${REQUIRED_EMAIL_SUFFIX}` : `faculty${REQUIRED_EMAIL_SUFFIX}`}
              list="bytehive-saved-auth-emails"
              required
            />
            {savedEmails.length > 0 && <datalist id="bytehive-saved-auth-emails">
              {savedEmails.map((savedEmail) => (
                <option key={savedEmail} value={savedEmail} />
              ))}
            </datalist>}
            <small className="auth-modal-hint">{getCollegeEmailMessage(roleLabel)}</small>
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

          {errorMessage && <p className="auth-modal-error">{errorMessage}</p>}

          <button type="submit" className="auth-modal-submit" disabled={isSubmitting}>
            {mode === "login" ? (
              <>
                {role === "student" ? <GraduationCap size={18} /> : <ShieldCheck size={18} />}
                {isSubmitting ? "Signing In..." : `Continue to ${roleLabel} Portal`}
              </>
            ) : (
              <>
                <UserPlus size={18} />
                {isSubmitting ? "Creating Account..." : `Create ${roleLabel} Account`}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
