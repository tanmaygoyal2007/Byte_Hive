import { ArrowLeft, Eye, EyeOff, KeyRound, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "@/components/lib/router";
import Footer from "@/components/components/layout/Footer";
import Navbar from "@/components/components/layout/Navbar";
import {
  changeVendorPassword,
  hasVendorAccount,
  loginVendorWithPassword,
  readVendorAccounts,
  signupVendorWithPassword,
  verifyVendorMasterKey,
} from "@/features/vendor/services/vendor.service";
import { setVendorOutlet, VENDOR_OUTLETS } from "@/features/vendor/services/vendor-portal.service";

type VendorAuthMode = "login" | "signup";
type VendorPasswordChangeMode = "login" | "password-change";

function VendorLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<VendorAuthMode>("login");
  const allOutlets = useMemo(() => [...VENDOR_OUTLETS], []);
  const registeredOutlets = useMemo(() => {
    return new Set(readVendorAccounts().map(account => account.outletName));
  }, []);
  const outlets = useMemo(() => {
    if (mode === "signup") {
      return allOutlets.filter(outlet => !registeredOutlets.has(outlet));
    }
    return allOutlets;
  }, [mode, allOutlets, registeredOutlets]);
  const [passwordChangeMode, setPasswordChangeMode] = useState<VendorPasswordChangeMode>("login");
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [masterKeyVerified, setMasterKeyVerified] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const requestedOutlet = searchParams.get("outlet");
    if (requestedOutlet && outlets.includes(requestedOutlet as typeof outlets[number])) {
      setSelectedOutlet(requestedOutlet);
    }
  }, [outlets, searchParams, mode, registeredOutlets]);

  const resetPasswordSetup = () => {
    setMasterKeyVerified(false);
    setMasterKey("");
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    setShowMasterKey(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const resetPasswordChangeFlow = () => {
    setPasswordChangeMode("login");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMasterKey("");
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setShowMasterKey(false);
    setError("");
    setSuccess("");
  };

  const resetVerifiedState = () => {
    setMasterKeyVerified(false);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const renderPasswordField = (params: {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    visible: boolean;
    onChange: (value: string) => void;
    onToggle: () => void;
  }) => (
    <div className="vendor-field">
      <label htmlFor={params.id}>{params.label}</label>
      <div className="vendor-password-field">
        <input
          id={params.id}
          type={params.visible ? "text" : "password"}
          className="vendor-input"
          value={params.value}
          onChange={(event) => params.onChange(event.target.value)}
          placeholder={params.placeholder}
        />
        <button
          type="button"
          className="vendor-password-toggle"
          onClick={params.onToggle}
          aria-label={params.visible ? `Hide ${params.label.toLowerCase()}` : `Show ${params.label.toLowerCase()}`}
        >
          {params.visible ? <EyeOff size={16} /> : <Eye size={16} />}
          {params.visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );

  const handleLogin = async () => {
    if (!selectedOutlet || !password && mode === "login") return;
    if (!selectedOutlet || !masterKey && mode === "signup" && !masterKeyVerified) return;

    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "signup") {
        if (hasVendorAccount(selectedOutlet)) {
          throw new Error("Vendor account already exists for this outlet. Login instead.");
        }

        if (!masterKeyVerified) {
          const result = await verifyVendorMasterKey(selectedOutlet, masterKey);
          if (!result.success) {
            throw new Error("Vendor authentication failed.");
          }

          setMasterKeyVerified(true);
          return;
        }

        if (password.length < 6) {
          throw new Error("Password should be at least 6 characters.");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        signupVendorWithPassword(selectedOutlet, password);
        setVendorOutlet(selectedOutlet);
        navigate("/vendor/dashboard");
        return;
      }

      loginVendorWithPassword(selectedOutlet, password);
      setVendorOutlet(selectedOutlet);
      navigate("/vendor/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Vendor authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedOutlet || !oldPassword || !masterKey || !newPassword) return;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    setError("");
    setSuccess("");

    try {
      await changeVendorPassword({
        outletName: selectedOutlet,
        oldPassword,
        masterKey,
        newPassword,
      });
      setSuccess("Password changed successfully.");
      setTimeout(() => {
        resetPasswordChangeFlow();
      }, 1500);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Unable to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="vendor-page vendor-login-page">
      <Navbar />
      <main className="vendor-main">
        <div className="vendor-auth-wrap">
          <section className="vendor-auth-card" aria-labelledby="vendor-login-title">
            <Link to="/" className="vendor-back-link vendor-login-home-link">
              <ArrowLeft size={18} />
              Back to Homepage
            </Link>

            <div className="vendor-auth-header">
              <span className="vendor-auth-icon" aria-hidden="true">
                <Store size={30} />
              </span>
              <h1 id="vendor-login-title">{mode === "login" ? "Vendor Login" : "Vendor Sign Up"}</h1>
              <p>{mode === "login" ? "Access your outlet management portal and keep orders moving smoothly." : "Create your vendor password once with the outlet master key."}</p>
              {selectedOutlet && <p className="vendor-form-hint">Direct access prepared for {selectedOutlet}.</p>}
            </div>

            <div className="vendor-auth-switcher">
              <button
                type="button"
                className={mode === "login" ? "vendor-auth-switch-active" : ""}
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                  resetPasswordSetup();
                  resetPasswordChangeFlow();
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={mode === "signup" ? "vendor-auth-switch-active" : ""}
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setSuccess("");
                  resetPasswordSetup();
                  resetPasswordChangeFlow();
                }}
              >
                Sign Up
              </button>
            </div>

            <div className="vendor-auth-form">
              {mode === "signup" && !masterKeyVerified ? (
                <>
                  <div className="vendor-field">
                    <label htmlFor="vendor-outlet">Select Your Outlet</label>
                    <select
                      id="vendor-outlet"
                      className="vendor-select"
                      value={selectedOutlet}
                      onChange={(event) => {
                        setSelectedOutlet(event.target.value);
                        resetPasswordSetup();
                      }}
                    >
                      <option value="">Choose outlet...</option>
                      {outlets.map((outlet) => (
                        <option key={outlet} value={outlet}>
                          {outlet}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="vendor-field">
                    <label htmlFor="vendor-master-key">Master Key</label>
                    <div className="vendor-password-field">
                      <div className="vendor-master-key-wrap">
                        <KeyRound size={18} className="vendor-master-key-icon" />
                        <input
                          id="vendor-master-key"
                          type={showMasterKey ? "text" : "password"}
                          className="vendor-input vendor-input-master-key"
                          value={masterKey}
                          onChange={(event) => {
                            setMasterKey(event.target.value);
                            resetVerifiedState();
                          }}
                          placeholder="Enter your master key"
                        />
                      </div>
                      <button
                        type="button"
                        className="vendor-password-toggle"
                        onClick={() => setShowMasterKey((current) => !current)}
                        aria-label={showMasterKey ? "Hide master key" : "Show master key"}
                      >
                        {showMasterKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showMasterKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="vendor-form-hint">Master key is provided by ByteHive admin.</p>
                  </div>
                </>
              ) : (
                <>
                  {mode === "login" && (
                    <div className="vendor-field">
                      <label htmlFor="vendor-outlet">Select Your Outlet</label>
                      <select
                        id="vendor-outlet"
                        className="vendor-select"
                        value={selectedOutlet}
                        onChange={(event) => {
                          setSelectedOutlet(event.target.value);
                          resetPasswordSetup();
                        }}
                      >
                        <option value="">Choose outlet...</option>
                        {outlets.map((outlet) => (
                          <option key={outlet} value={outlet}>
                            {outlet}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {mode === "signup" && (
                    <p className="vendor-form-hint vendor-form-success">
                      Master key verified for {selectedOutlet}. Set a password to continue.
                    </p>
                  )}

                  {mode === "login" && passwordChangeMode === "password-change" ? (
                    <>
                      {renderPasswordField({
                        id: "vendor-old-password",
                        label: "Current Password",
                        value: oldPassword,
                        placeholder: "Enter current password",
                        visible: showOldPassword,
                        onChange: setOldPassword,
                        onToggle: () => setShowOldPassword((current) => !current),
                      })}

                      <div className="vendor-field">
                        <label htmlFor="vendor-change-master-key">Master Key</label>
                        <div className="vendor-password-field">
                          <div className="vendor-master-key-wrap">
                            <KeyRound size={18} className="vendor-master-key-icon" />
                            <input
                              id="vendor-change-master-key"
                              type={showMasterKey ? "text" : "password"}
                              className="vendor-input vendor-input-master-key"
                              value={masterKey}
                              onChange={(event) => setMasterKey(event.target.value)}
                              placeholder="Enter your master key"
                            />
                          </div>
                          <button
                            type="button"
                            className="vendor-password-toggle"
                            onClick={() => setShowMasterKey((current) => !current)}
                            aria-label={showMasterKey ? "Hide master key" : "Show master key"}
                          >
                            {showMasterKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            {showMasterKey ? "Hide" : "Show"}
                          </button>
                        </div>
                        <p className="vendor-form-hint">Master key is provided by ByteHive admin.</p>
                      </div>

                      {renderPasswordField({
                        id: "vendor-new-password",
                        label: "New Password",
                        value: newPassword,
                        placeholder: "Enter new password",
                        visible: showNewPassword,
                        onChange: setNewPassword,
                        onToggle: () => setShowNewPassword((current) => !current),
                      })}

                      {renderPasswordField({
                        id: "vendor-confirm-new-password",
                        label: "Confirm New Password",
                        value: confirmPassword,
                        placeholder: "Confirm new password",
                        visible: showConfirmNewPassword,
                        onChange: setConfirmPassword,
                        onToggle: () => setShowConfirmNewPassword((current) => !current),
                      })}
                    </>
                  ) : (
                    <>
                      {renderPasswordField({
                        id: "vendor-password",
                        label: "Password",
                        value: password,
                        placeholder: mode === "login" ? "Enter password" : "Create password",
                        visible: showPassword,
                        onChange: setPassword,
                        onToggle: () => setShowPassword((current) => !current),
                      })}

                      {mode === "signup" && renderPasswordField({
                        id: "vendor-confirm-password",
                        label: "Confirm Password",
                        value: confirmPassword,
                        placeholder: "Confirm password",
                        visible: showConfirmPassword,
                        onChange: setConfirmPassword,
                        onToggle: () => setShowConfirmPassword((current) => !current),
                      })}
                    </>
                  )}
                </>
              )}

              {error && <p className="vendor-form-hint vendor-form-error">{error}</p>}
              {success && <p className="vendor-form-hint vendor-form-success">{success}</p>}

              <button
                type="button"
                className="vendor-button"
                disabled={
                  !selectedOutlet
                  || isSubmitting
                  || isChangingPassword
                  || (mode === "login" && passwordChangeMode !== "password-change" && !password)
                  || (mode === "signup" && !masterKeyVerified && !masterKey)
                  || (mode === "signup" && masterKeyVerified && (!password || !confirmPassword))
                  || (mode === "login" && passwordChangeMode === "password-change" && (!oldPassword || !masterKey || !newPassword || !confirmPassword))
                }
                onClick={passwordChangeMode === "password-change" ? handleChangePassword : handleLogin}
              >
                {mode === "login"
                  ? (passwordChangeMode === "password-change"
                    ? (isChangingPassword ? "Changing Password..." : "Change Password")
                    : (isSubmitting ? "Signing In..." : "Login"))
                  : (!masterKeyVerified
                    ? (isSubmitting ? "Verifying..." : "Verify Master Key")
                    : (isSubmitting ? "Creating Account..." : "Create Vendor Account"))}
              </button>

              {mode === "login" && passwordChangeMode === "login" && (
                <button
                  type="button"
                  className="vendor-change-password-link"
                  onClick={() => {
                    setPasswordChangeMode("password-change");
                    setError("");
                    setSuccess("");
                  }}
                >
                  <KeyRound size={14} />
                  Change Password
                </button>
              )}

              {mode === "login" && passwordChangeMode === "password-change" && (
                <button
                  type="button"
                  className="vendor-change-password-link"
                  onClick={() => {
                    resetPasswordChangeFlow();
                  }}
                >
                  Back to Login
                </button>
              )}
            </div>

            <div className="vendor-help-row">
              <p className="vendor-auth-help">
                Need help? <a className="vendor-link-inline vendor-link-inline-break" href="mailto:support@bytehive.com">Contact Support</a>
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer variant="vendor" />
    </div>
  );
}

export default VendorLoginPage;
