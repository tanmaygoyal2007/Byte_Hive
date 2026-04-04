import React, { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import "./ContactSection.css";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Send, CheckCircle } from "lucide-react";

const SERVICE_ID = "service_mtlp8ar";
const TEMPLATE_ID = "template_v8b1mmf";
const PUBLIC_KEY = "AZUeKttsLJ66YRG_c";

const ContactSection: React.FC = () => {
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
    if (!name || !email || !question) {
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                    <label htmlFor="phone">Contact Number (Optional)</label>
                  </div>

                  <div className="input-group">
                    <textarea
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder=" "
                      disabled={isLoading}
                      required
                    />
                    <label htmlFor="question">Your Question</label>
                  </div>

                  <motion.button
                    ref={submitRef}
                    className={`submit-btn premium-btn ${isLoading ? "loading" : ""}`}
                    type="submit"
                    disabled={isLoading}
                    style={{ x: magneticX, y: magneticY }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? "Sending..." : <><Send size={18} /> Submit Question</>}
                  </motion.button>
                  
                  {status === "error" && (
                    <p className="error-text">Please fill in all required fields.</p>
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