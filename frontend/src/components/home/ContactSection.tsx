import React, { useEffect, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import "./ContactSection.css";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Send, CheckCircle, Lock } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { requestAuthPrompt } from "../../utils/orderPortal";

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

  const submitRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const magneticX = useSpring(x, springConfig);
  const magneticY = useSpring(y, springConfig);

  useEffect(() => {
    if (!user) return;
    setName((current) => current || user.displayName || "");
    setEmail((current) => current || user.email || "");
  }, [user]);

  const handleTrack = (e: React.MouseEvent) => {
    if (!submitRef.current || status === "success") return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = submitRef.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.25);
    y.set(middleY * 0.25);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

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
    } catch (err) {
      console.error("EmailJS error:", err);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.section 
      id="about" 
      className="contact-section"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
    >
      {/* Background Glow behind the card */}
      <div className="section-glow"></div>

      <div className="contact-container">
        <motion.div 
          className="section-header"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="contact-title glow-text">Have a question in your mind?</h1>
          <p className="subtitle">Let us help you! Our team is just a message away.</p>
        </motion.div>

        <div className="contact-centered-wrapper">
          <motion.div 
            className="contact-card-wrapper"
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
          >
            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div 
                  key="success"
                  className="success-content"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
                  >
                    <CheckCircle className="success-icon" size={80} />
                  </motion.div>
                  <h2 className="success-title">Message Sent Successfully!</h2>
                  <p className="success-subtitle">We'll get back to you shortly.</p>
                  <button className="reset-btn" onClick={() => setStatus("idle")}>
                    Send Another message
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  key="form"
                  className="contact-card" 
                  onSubmit={handleSubmit}
                  onMouseMove={handleTrack}
                  onMouseLeave={handleLeave}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
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

                  <motion.button
                    ref={submitRef}
                    className={`submit-btn premium-btn ${isLoading ? "loading" : ""}`}
                    type="submit"
                    disabled={isLoading || !canSubmit}
                    style={{ x: magneticX, y: magneticY }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? "Sending..." : !user ? <><Lock size={18} /> Login to Submit</> : submissionsLeft === 0 ? "Submission Limit Reached" : <><Send size={18} /> Submit Question</>}
                  </motion.button>
                  
                  {status === "error" && (
                    <p className="error-text">
                      {!user
                        ? "Please log in before sending a question."
                        : submissionsLeft === 0
                          ? "You have reached the 5-question limit for this account."
                          : "Please fill in all required fields."}
                    </p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default ContactSection;
