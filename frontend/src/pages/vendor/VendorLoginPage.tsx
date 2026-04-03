import { KeyRound, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import { authenticateVendor } from "../../services/vendorAuthService";
import { setVendorOutlet, VENDOR_OUTLETS } from "../../utils/vendorPortal";
import "./VendorPortal.css";

function VendorLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outlets = useMemo(() => [...VENDOR_OUTLETS], []);
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const requestedOutlet = searchParams.get("outlet");
    if (requestedOutlet && outlets.includes(requestedOutlet as typeof outlets[number])) {
      setSelectedOutlet(requestedOutlet);
    }
  }, [outlets, searchParams]);

  const handleLogin = async () => {
    if (!selectedOutlet || !masterKey) return;

    setIsSubmitting(true);
    setError("");

    try {
      const result = await authenticateVendor(selectedOutlet, masterKey);
      if (!result.success) {
        throw new Error("Vendor authentication failed.");
      }

      setVendorOutlet(result.outletName);
      navigate("/vendor/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Vendor authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="vendor-page vendor-login-page">
      <Navbar />
      <main className="vendor-main">
        <div className="vendor-auth-wrap">
          <section className="vendor-auth-card" aria-labelledby="vendor-login-title">
            <div className="vendor-auth-header">
              <span className="vendor-auth-icon" aria-hidden="true">
                <Store size={30} />
              </span>
              <h1 id="vendor-login-title">Vendor Login</h1>
              <p>Access your outlet management portal and keep orders moving smoothly.</p>
              {selectedOutlet && <p className="vendor-form-hint">Direct access prepared for {selectedOutlet}.</p>}
            </div>

            <div className="vendor-auth-form">
              <div className="vendor-field">
                <label htmlFor="vendor-outlet">Select Your Outlet</label>
                <select
                  id="vendor-outlet"
                  className="vendor-select"
                  value={selectedOutlet}
                  onChange={(event) => setSelectedOutlet(event.target.value)}
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
                <div className="vendor-field vendor-field-password">
                  <div style={{ position: "relative" }}>
                    <KeyRound size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      id="vendor-master-key"
                      type="password"
                      className="vendor-input"
                      style={{ paddingLeft: 46 }}
                      value={masterKey}
                      onChange={(event) => setMasterKey(event.target.value)}
                      placeholder="Enter your master key"
                    />
                  </div>
                </div>
                <p className="vendor-form-hint">Master key is provided by ByteHive admin.</p>
              </div>

              {error && <p className="vendor-form-hint" style={{ color: "#d04747" }}>{error}</p>}

              <button
                type="button"
                className="vendor-button"
                disabled={!selectedOutlet || !masterKey || isSubmitting}
                onClick={handleLogin}
              >
                {isSubmitting ? "Verifying..." : "Access Dashboard"}
              </button>
            </div>

            <div className="vendor-help-row">
              <p className="vendor-auth-help">
                Need help? <a className="vendor-link-inline" href="mailto:support@bytehive.com">Contact Support</a>
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default VendorLoginPage;
