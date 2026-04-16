import { CheckCircle2, Eye, EyeOff, GraduationCap, KeyRound, LogIn, Mail, RotateCw, ShieldCheck, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { changePassword, hasLocalAccount } from "@/features/auth/services/auth.service";
import { sendSignupOtp, verifySignupOtp } from "@/features/auth/services/otp.service";

type AuthRole = "student" | "faculty";
type AuthMode = "login" | "signup";
type PasswordChangeMode = "login" | "password-change";

type AuthModalProps = {
  isOpen: boolean;
  role: AuthRole;
  onClose: () => void;
  onSubmit: (payload: { role: AuthRole; mode: AuthMode; name: string; email: string; password: string }) => Promise<void>;
};

const SAVED_EMAILS_KEY = "bytehive-saved-auth-emails";
type SignupStep = "identity" | "otp" | "password";

function isValidEmailAddress(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  if (normalized.includes("..")) return false;

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
  if (domain.startsWith("-") || domain.endsWith("-")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;

  return true;
}

function getCollegeEmailMessage(roleLabel: string) {
  return `Use your ${roleLabel.toLowerCase()} college email.`;
}

function getRequiredEmailDomain(role: AuthRole) {
  return role === "faculty" ? "christuniversity.in" : ".christuniversity.in";
}

function readSavedEmails() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const stored = localStorage.getItem(SAVED_EMAILS_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
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
  const [passwordChangeMode, setPasswordChangeMode] = useState<PasswordChangeMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [signupStep, setSignupStep] = useState<SignupStep>("identity");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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
      setPasswordChangeMode("login");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setOldPassword("");
      setNewPassword("");
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
      setOtpCode("");
      setSignupStep("identity");
      setOtpVerified(false);
      setOtpExpiresAt(null);
      setResendAvailableAt(null);
      setIsSubmitting(false);
      setIsSendingOtp(false);
      setIsVerifyingOtp(false);
      setIsChangingPassword(false);
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSavedEmails(readSavedEmails());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== "signup" || signupStep !== "otp") return;

    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isOpen, mode, signupStep]);

  const roleLabel = useMemo(() => (role === "student" ? "Student" : "Faculty"), [role]);
  const normalizedEmail = email.trim().toLowerCase();
  const otpSecondsLeft = otpExpiresAt ? Math.max(0, Math.ceil((otpExpiresAt - now) / 1000)) : 0;
  const resendSecondsLeft = resendAvailableAt ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000)) : 0;

  if (!isOpen) return null;

  const resetSignupFlow = () => {
    setSignupStep("identity");
    setOtpCode("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setOtpVerified(false);
    setOtpExpiresAt(null);
    setResendAvailableAt(null);
    setSuccessMessage("");
  };

  const resetPasswordChangeFlow = () => {
    setPasswordChangeMode("login");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const formatCountdown = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const validateEmailForAuth = () => {
    if (!isValidEmailAddress(normalizedEmail)) {
      setErrorMessage("Enter a valid email address.");
      return false;
    }

    const requiredDomain = getRequiredEmailDomain(role);
    const [, domain = ""] = normalizedEmail.split("@");

    if (role === "faculty" ? domain !== requiredDomain : !normalizedEmail.endsWith(requiredDomain)) {
      setErrorMessage(getCollegeEmailMessage(roleLabel));
      return false;
    }

    return true;
  };

  const handleSendOtp = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("Enter your full name.");
      return;
    }

    if (!validateEmailForAuth()) {
      return;
    }

    if (hasLocalAccount(normalizedEmail)) {
      setErrorMessage("This email is already registered.");
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await sendSignupOtp(normalizedEmail, role);
      setSignupStep("otp");
      setOtpCode("");
      setOtpVerified(false);
      setOtpExpiresAt(response.expiresAt);
      setResendAvailableAt(response.resendAvailableAt);
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!otpCode.trim()) {
      setErrorMessage("Enter the OTP.");
      return;
    }

    if (otpSecondsLeft <= 0) {
      setErrorMessage("OTP expired. Please request a new code.");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      await verifySignupOtp(normalizedEmail, otpCode, role);
      setOtpVerified(true);
      setSignupStep("password");
      setSuccessMessage("OTP verified. Set your password to finish signup.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify OTP.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleChangePassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!oldPassword) {
      setErrorMessage("Enter your current password.");
      return;
    }

    if (!newPassword) {
      setErrorMessage("Enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMessage("New password cannot be the same as current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword({ email: normalizedEmail, oldPassword, newPassword });
      setSuccessMessage("Password changed successfully.");
      setTimeout(() => {
        setPasswordChangeMode("login");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrorMessage("");
        setSuccessMessage("");
      }, 1500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (passwordChangeMode === "password-change") {
      await handleChangePassword();
      return;
    }

    if (!validateEmailForAuth()) {
      return;
    }

    if (mode === "signup") {
      if (signupStep === "identity") {
        await handleSendOtp();
        return;
      }

      if (signupStep === "otp") {
        await handleVerifyOtp();
        return;
      }

      if (!otpVerified) {
        setErrorMessage("Verify your OTP before creating a password.");
        return;
      }

      if (password.length < 6) {
        setErrorMessage("Password should be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        role,
        mode,
        name: mode === "signup" ? name.trim() || `${roleLabel} Name` : `${roleLabel} Name`,
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

  const renderPasswordField = (params: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    visible: boolean;
    onToggle: () => void;
  }) => (
    <label>
      {params.label}
      <div className="auth-password-field">
        <input
          type={params.visible ? "text" : "password"}
          value={params.value}
          onChange={(event) => params.onChange(event.target.value)}
          placeholder={params.placeholder}
          required
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={params.onToggle}
          aria-label={params.visible ? `Hide ${params.label.toLowerCase()}` : `Show ${params.label.toLowerCase()}`}
        >
          {params.visible ? <EyeOff size={16} /> : <Eye size={16} />}
          {params.visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );

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
              setSuccessMessage("");
              resetSignupFlow();
              resetPasswordChangeFlow();
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
              setSuccessMessage("");
              resetSignupFlow();
            }}
          >
            <UserPlus size={16} />
            Sign Up
          </button>
        </div>

        <form className="auth-modal-form" onSubmit={handleSubmit}>
          {mode === "signup" && signupStep === "identity" && (
            <label>
              Full Name
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (signupStep !== "identity") resetSignupFlow();
                }}
                placeholder={`${roleLabel} Name`}
                required
              />
            </label>
          )}

          {mode === "signup" && signupStep !== "password" && (
            <label>
              College Email
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (mode === "signup" && signupStep !== "identity") resetSignupFlow();
                }}
                placeholder={role === "student" ? "student@dept.christuniversity.in" : "faculty@christuniversity.in"}
                list="bytehive-saved-auth-emails"
                required
              />
              {savedEmails.length > 0 && (
                <datalist id="bytehive-saved-auth-emails">
                  {savedEmails.map((savedEmail) => (
                    <option key={savedEmail} value={savedEmail} />
                  ))}
                </datalist>
              )}
              <small className="auth-modal-hint">{getCollegeEmailMessage(roleLabel)}</small>
            </label>
          )}

          {mode === "login" && (
            <>
              {passwordChangeMode === "password-change" ? (
                <>
                  <label>
                    College Email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={role === "student" ? "student@dept.christuniversity.in" : "faculty@christuniversity.in"}
                      list="bytehive-saved-auth-emails"
                      required
                    />
                    {savedEmails.length > 0 && (
                      <datalist id="bytehive-saved-auth-emails">
                        {savedEmails.map((savedEmail) => (
                          <option key={savedEmail} value={savedEmail} />
                        ))}
                      </datalist>
                    )}
                  </label>

                  {renderPasswordField({
                    label: "Current Password",
                    value: oldPassword,
                    onChange: setOldPassword,
                    placeholder: "Enter current password",
                    visible: showOldPassword,
                    onToggle: () => setShowOldPassword((current) => !current),
                  })}

                  {renderPasswordField({
                    label: "New Password",
                    value: newPassword,
                    onChange: setNewPassword,
                    placeholder: "Enter new password",
                    visible: showNewPassword,
                    onToggle: () => setShowNewPassword((current) => !current),
                  })}

                  {renderPasswordField({
                    label: "Confirm New Password",
                    value: confirmPassword,
                    onChange: setConfirmPassword,
                    placeholder: "Confirm new password",
                    visible: showConfirmNewPassword,
                    onToggle: () => setShowConfirmNewPassword((current) => !current),
                  })}
                </>
              ) : (
                <>
                  <label>
                    College Email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={role === "student" ? "student@dept.christuniversity.in" : "faculty@christuniversity.in"}
                      list="bytehive-saved-auth-emails"
                      required
                    />
                    {savedEmails.length > 0 && (
                      <datalist id="bytehive-saved-auth-emails">
                        {savedEmails.map((savedEmail) => (
                          <option key={savedEmail} value={savedEmail} />
                        ))}
                      </datalist>
                    )}
                  </label>

                  {renderPasswordField({
                    label: "Password",
                    value: password,
                    onChange: setPassword,
                    placeholder: "Enter password",
                    visible: showPassword,
                    onToggle: () => setShowPassword((current) => !current),
                  })}
                </>
              )}
            </>
          )}

          {mode === "signup" && signupStep === "otp" && (
            <>
              <div className="auth-otp-panel">
                <div className="auth-otp-panel-top">
                  <strong>Email verification</strong>
                  <span>{formatCountdown(otpSecondsLeft)}</span>
                </div>
                <p>Enter the 6-digit OTP sent to {normalizedEmail}.</p>
              </div>

              <label>
                OTP
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  required
                />
              </label>

              <div className="auth-otp-actions">
                <button
                  type="button"
                  className="auth-otp-secondary"
                  onClick={() => {
                    setErrorMessage("");
                    setSuccessMessage("");
                    setSignupStep("identity");
                  }}
                >
                  Change details
                </button>
                <button
                  type="button"
                  className="auth-otp-secondary"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || resendSecondsLeft > 0}
                >
                  <RotateCw size={16} />
                  {isSendingOtp ? "Sending..." : resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}

          {mode === "signup" && signupStep === "password" && (
            <>
              {renderPasswordField({
                label: "Password",
                value: password,
                onChange: setPassword,
                placeholder: "Create password",
                visible: showPassword,
                onToggle: () => setShowPassword((current) => !current),
              })}

              {renderPasswordField({
                label: "Confirm Password",
                value: confirmPassword,
                onChange: setConfirmPassword,
                placeholder: "Confirm password",
                visible: showConfirmPassword,
                onToggle: () => setShowConfirmPassword((current) => !current),
              })}
            </>
          )}

          {errorMessage && <p className="auth-modal-error">{errorMessage}</p>}
          {successMessage && <p className="auth-modal-success">{successMessage}</p>}

          <button
            type="submit"
            className="auth-modal-submit"
            disabled={isSubmitting || isSendingOtp || isVerifyingOtp || isChangingPassword}
          >
            {mode === "login" ? (
              passwordChangeMode === "password-change" ? (
                <>
                  <KeyRound size={18} />
                  {isChangingPassword ? "Changing Password..." : "Change Password"}
                </>
              ) : (
                <>
                  {role === "student" ? <GraduationCap size={18} /> : <ShieldCheck size={18} />}
                  {isSubmitting ? "Signing In..." : `Continue to ${roleLabel} Portal`}
                </>
              )
            ) : (
              <>
                <Mail size={18} />
                {signupStep === "identity" && (isSendingOtp ? "Sending OTP..." : "Send OTP")}
                {signupStep === "otp" && (isVerifyingOtp ? "Verifying OTP..." : "Verify OTP")}
                {signupStep === "password" && (isSubmitting ? "Creating Account..." : `Create ${roleLabel} Account`)}
              </>
            )}
          </button>

          {mode === "login" && passwordChangeMode === "login" && (
            <button
              type="button"
              className="auth-change-password-link"
              onClick={() => {
                setPasswordChangeMode("password-change");
                setErrorMessage("");
                setSuccessMessage("");
              }}
            >
              <KeyRound size={14} />
              Change Password
            </button>
          )}

          {mode === "login" && passwordChangeMode === "password-change" && (
            <button
              type="button"
              className="auth-change-password-link"
              onClick={() => {
                resetPasswordChangeFlow();
              }}
            >
              Back to Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
