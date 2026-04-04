import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import "./ContactSection.css";

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
      <h1 className="contact-title">
        Have a question in your mind? <br /> Let us help you!
      </h1>

      {/* Success message */}
      {status === "success" && (
        <div className="contact-alert contact-alert-success">
          ✅ Your question has been submitted! We'll get back to you soon.
        </div>
      )}

      {/* Error message */}
      {status === "error" && (
        <div className="contact-alert contact-alert-error">
          ❌ Please fill in your name, email and question before submitting.
        </div>
      )}

      <form className="contact-card" onSubmit={handleSubmit}>
        <div className="row">
          <div className="input-group">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
              required
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@college.edu"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="input-group full">
          <label>Contact Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            disabled={isLoading}
          />
        </div>

        <div className="input-group full">
          <label>Your Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Tell us what's on your mind..."
            disabled={isLoading}
            required
          />
        </div>

        <button
          className={`submit-btn ${isLoading ? "submit-btn-loading" : ""}`}
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "✈ Submit Question"}
        </button>
      </form>
    </section>
  );
};

export default ContactSection;