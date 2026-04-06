import { useEffect } from "react";
import { Clock3, Github, Linkedin, MapPin, Shield, Smartphone, Target, UtensilsCrossed, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import "../pages/vendor/VendorPortal.css";
import "./AboutPage.css";

const stats = [
  { value: "9+", label: "Campus Outlets" },
  { value: "50+", label: "Menu Items" },
  { value: "100%", label: "Mobile-First" },
  { value: "Real-Time", label: "Order Updates" },
];

const offerings = [
  {
    icon: UtensilsCrossed,
    title: "Real-Time Menus",
    description: "Browse up-to-date menus from all campus canteens with pricing, availability, and detailed item descriptions.",
  },
  {
    icon: MapPin,
    title: "Location-Based Discovery",
    description: "Find canteens by block location, making it easy to order from outlets closest to your current building.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    description: "Fully responsive interface optimized for smartphones, tablets, and desktops for ordering on the go.",
  },
  {
    icon: Clock3,
    title: "Quick Order Management",
    description: "Add items to cart, review orders, and track pickup times with a streamlined checkout experience.",
  },
  {
    icon: Shield,
    title: "Vendor Portal",
    description: "Dedicated dashboard for canteen vendors to manage menus, track orders, and update availability in real-time.",
  },
  {
    icon: Users,
    title: "Community-Focused",
    description: "Built by students, for students, addressing real campus dining challenges with practical solutions.",
  },
];

const founders = [
  {
    initial: "T",
    name: "Tanmay Goyal",
    subtitle: "BCA, Semester 2",
    role: "Full Stack Developer",
    description: "Primary developer responsible for architecture, frontend, and backend implementation.",
    github: "https://github.com/tanmaygoyal2007",
    linkedin: "https://www.linkedin.com/in/tanmay-goyal-6205472a6/?trk=opento_sprofile_details",
  },
  {
    initial: "D",
    name: "Devraj Singh",
    subtitle: "BCA, Semester 2",
    role: "Full Stack Developer",
    description: "Core contributor focusing on system design, user experience, and feature development.",
    github: "https://github.com/Devrajj-Singh",
    linkedin: "https://www.linkedin.com/in/devraj-singh-2bba08374/",
  },
];

const projectPillars = ["Idea", "Design", "Development", "Mobile UX", "Vendor Portal", "QR Flow"];

function AboutPage() {
  const location = useLocation();
  const isVendorAbout = location.pathname.startsWith("/vendor/");

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".about-animate");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("about-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-page">
      <Navbar />
      <main className="about-main">
        {isVendorAbout && (
          <div className="vendor-shell" style={{ marginBottom: "12px" }}>
            <Link to="/vendor/dashboard" className="vendor-back-link">
              Back to Vendor Portal
            </Link>
          </div>
        )}
        <section className="about-hero about-animate about-visible">
          <span className="about-kicker">{isVendorAbout ? "Vendor Platform Story" : "Built for Campus Life"}</span>
          <h1>
            About <span>{isVendorAbout ? "ByteHive Vendor Portal" : "ByteHive"}</span>
          </h1>
          <p>{isVendorAbout ? "Understand the platform behind outlet operations, queue control, and campus ordering." : "Transforming campus dining through technology and innovation"}</p>
        </section>

        <section className="about-section about-intro about-animate">
          <div className="about-intro-copy">
            <h2>What is ByteHive?</h2>
            <p>
              ByteHive is a comprehensive digital platform designed to revolutionize the campus food ordering experience.
              We bring <strong>transparency, efficiency, and convenience</strong> to college canteen management by providing
              students, faculty, and vendors with a centralized hub for food discovery and ordering.
            </p>
            <p>
              Our platform empowers users to make informed dining decisions by offering real-time menu
              <strong> availability</strong>, pricing information, and canteen details all in one place.
            </p>
            <p>
              Built with modern web technologies and a user-first approach, ByteHive bridges the gap between campus food
              vendors and the college community, creating a seamless ecosystem that saves time and enhances the overall
              dining experience.
            </p>
          </div>

          <div className="about-stats-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="about-stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section about-mission about-animate">
          <div className="about-mission-icon">
            <Target size={26} />
          </div>
          <h2>Our Mission</h2>
          <p className="about-section-copy">
            At ByteHive, we're on a mission to eliminate the confusion and inefficiency surrounding campus dining. We
            believe that technology should simplify everyday tasks, and ordering food shouldn't be an exception.
          </p>
          <blockquote className="about-quote">
            "Empowering students and faculty with instant access to campus dining options, helping them make faster
            decisions and manage their time more effectively."
          </blockquote>
          <p className="about-section-copy about-mission-copy">
            Through innovation, <strong>transparency</strong>, and a commitment to user experience, we're building a
            platform that transforms how the college community interacts with food services, one order at a time.
          </p>
          <p className="about-mission-note">
            Making campus dining accessible, transparent, and efficient for everyone.
          </p>
        </section>

        <section className="about-section about-animate">
          <h2>What We Offer</h2>
          <p className="about-section-subtitle">Designed to simplify everyday campus dining</p>
          <div className="about-offer-grid">
            {offerings.map(({ icon: Icon, title, description }) => (
              <article key={title} className="about-offer-card">
                <span className="about-offer-icon">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section about-team about-animate">
          <h2>Meet the Team Behind ByteHive</h2>
          <p className="about-section-copy">
            ByteHive is a student-driven project built as part of academic learning, combining technical skills with
            real-world problem-solving to create meaningful campus solutions.
          </p>

          <h3 className="about-team-heading">Founders & Main Developers</h3>
          <div className="about-team-grid about-team-grid-founders">
            {founders.map((member) => (
              <article key={member.name} className="about-team-card about-team-card-large">
                <div className="about-avatar">{member.initial}</div>
                <h4>{member.name}</h4>
                <span className="about-member-subtitle">{member.subtitle}</span>
                <span className="about-member-role">{member.role}</span>
                <p>{member.description}</p>
                <div className="about-member-links">
                  <a href={member.github} target="_blank" rel="noreferrer noopener" aria-label={`${member.name} GitHub`}>
                    <Github size={16} />
                  </a>
                  <a href={member.linkedin} target="_blank" rel="noreferrer noopener" aria-label={`${member.name} LinkedIn`}>
                    <Linkedin size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section about-purpose about-animate">
          <span className="about-kicker">Academic & Practical Project</span>
          <h2>Built with Purpose</h2>
          <div className="about-pill-row">
            {projectPillars.map((pillar) => (
              <span key={pillar} className="about-pill">
                {pillar}
              </span>
            ))}
          </div>
          <p className="about-section-copy">
            ByteHive is developed as part of our semester Web Stack project, showcasing our commitment to
            <strong> teamwork, accessibility,</strong> and <strong>real-world problem-solving.</strong>
          </p>
          <p className="about-section-copy">
            This project represents our dedication to creating meaningful digital solutions that address genuine campus
            challenges while demonstrating technical proficiency and user-centered design thinking.
          </p>
          <p className="about-mission-note">
            Designed with real-world usability in mind, ByteHive bridges academic learning with practical application.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default AboutPage;
