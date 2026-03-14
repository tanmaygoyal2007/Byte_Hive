import React, { useState } from "react";
import "./ContactSection.css";

const ContactSection:React.FC = () => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [question, setQuestion] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// For now just log. Wire to API later.
		console.log({ name, email, phone, question });
		alert("Thanks! Your question has been submitted.");
		setName(""); setEmail(""); setPhone(""); setQuestion("");
	}

	return(
		<section className="contact-section">

			<h1 className="contact-title">Have a question in your mind? <br/> Let us help you!</h1>

			<form className="contact-card" onSubmit={handleSubmit}>
				<div className="row">
					<div className="input-group">
						<label>Name</label>
						<input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
					</div>

					<div className="input-group">
						<label>Email</label>
						<input value={email} onChange={e => setEmail(e.target.value)} placeholder="your.email@college.edu" />
					</div>
				</div>

				<div className="input-group full">
					<label>Contact Number</label>
					<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
				</div>

				<div className="input-group full">
					<label>Your Question</label>
					<textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Tell us what's on your mind..." />
				</div>

				<button className="submit-btn" type="submit">✈ Submit Question</button>
			</form>

		</section>
	)

}

export default ContactSection;