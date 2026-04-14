import React, { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import { Send, CheckCircle, Lock } from "lucide-react";
import useAuth from "@/features/auth/hooks/useAuth";
import { requestAuthPrompt } from "@/features/orders/services/order-portal.service";

const SERVICE_ID = "service_mtlp8ar";
const TEMPLATE_ID = "template_v8b1mmf";
const PUBLIC_KEY = "AZUeKttsLJ66YRG_c";
const CONTACT_LIMIT_KEY = "bytehive-contact-submissions";
const MAX_SUBMISSIONS_PER_USER = 5;

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

function readSubmissionCounts() {
  if (typeof window === "undefined") return {} as Record<string, number>;

  try {
    const stored = localStorage.getItem(CONTACT_LIMIT_KEY);
    return stored ? JSON.parse(stored) as Record<string, number> : {};
  } catch {
    return {};
  }
}

function saveSubmissionCount(userKey: string, nextCount: number) {
  if (typeof window === "undefined") return;

  const counts = readSubmissionCounts();
  localStorage.setItem(
    CONTACT_LIMIT_KEY,
    JSON.stringify({
      ...counts,
      [userKey]: nextCount,
    })
  );
}

const ContactSection: React.FC = () => {
  const { user } = useAuth();
  const userKey = user?.uid ?? user?.email ?? "";
  const submissionCount = userKey ? readSubmissionCounts()[userKey] ?? 0 : 0;
  const submissionsLeft = Math.max(0, MAX_SUBMISSIONS_PER_USER - submissionCount);
  const canSubmit = Boolean(user) && submissionsLeft > 0;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!user) return;
    setName((current) => current || user.displayName || "");
    setEmail((current) => current || user.email || "");
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userKey) {
      setStatus("error");
      return;
    }

    if (submissionCount >= MAX_SUBMISSIONS_PER_USER) {
      setStatus("error");
      return;
    }

    if (!name || !email || !question) {
      setStatus("error");
      return;
    }

    if (!isValidEmailAddress(email)) {
      setStatus("error");
      return;
    }
    setIsLoading(true);
    setStatus("idle");

    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: name,
          from_email: email,
          contact_number: phone || "Not provided",
          message: question,
        },
        PUBLIC_KEY
      );
      saveSubmissionCount(userKey, submissionCount + 1);
      setStatus("success");
      setName("");
      setEmail("");
      setPhone("");
      setQuestion("");
    } catch (err) {
      console.error("EmailJS error:", err);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="about" className="contact-section">
      <div className="contact-inner">
        <h1 className="contact-title">
          <span>Have a question in your mind?</span>
          <span>Let us help you!</span>
        </h1>

        {status === "success" ? (
          <div className="contact-card success-content">
            <CheckCircle className="success-icon" size={80} />
            <h2 className="success-title">Message Sent Successfully!</h2>
            <p className="success-subtitle">We'll get back to you shortly.</p>
            <button className="reset-btn" type="button" onClick={() => setStatus("idle")}>
              Send Another Message
            </button>
          </div>
        ) : (
          <form className="contact-card" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                disabled={isLoading || !user}
                required
              />
              <label htmlFor="name">Your Name</label>
            </div>

            <div className="input-group">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                disabled={isLoading || !user}
                required
              />
              <label htmlFor="email">Email Address</label>
            </div>

            <div className="input-group">
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder=" "
                disabled={isLoading || !user}
              />
              <label htmlFor="phone">Contact Number (Optional)</label>
            </div>

            <div className="input-group">
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder=" "
                disabled={isLoading || !user || submissionsLeft === 0}
                required
              />
              <label htmlFor="question">Your Question</label>
            </div>

            <div className="contact-access-note">
              {!user ? (
                <>
                  <Lock size={16} />
                  <span>You need to log in before sending a question.</span>
                  <button type="button" onClick={() => requestAuthPrompt({ reason: "upgrade-guest", role: "student" })}>
                    Login
                  </button>
                </>
              ) : (
                <span>{submissionsLeft} of {MAX_SUBMISSIONS_PER_USER} submissions remaining for your account.</span>
              )}
            </div>

            <button
              className={`submit-btn premium-btn ${isLoading ? "loading" : ""}`}
              type="submit"
              disabled={isLoading || !canSubmit}
            >
              {isLoading ? (
                "Sending..."
              ) : !user ? (
                <>
                  <Lock size={18} /> Login to Submit
                </>
              ) : submissionsLeft === 0 ? (
                "Submission Limit Reached"
              ) : (
                <>
                  <Send size={18} /> Submit Question
                </>
              )}
            </button>

            {status === "error" && (
              <p className="error-text">
                {!user
                  ? "Please log in before sending a question."
                  : submissionsLeft === 0
                    ? "You have reached the 5-question limit for this account."
                    : "Please fill in all required fields."}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
};

export default ContactSection;
