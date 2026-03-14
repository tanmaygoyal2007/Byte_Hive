import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar: React.FC = () => {

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // initialize from body class or localStorage
    try {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
    } catch (e) {}
    return false;
  });

  const navigate = useNavigate();

  React.useEffect(() => {
    // apply initial theme
    if (darkMode) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      try { localStorage.setItem('theme','dark') } catch(e){}
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
      try { localStorage.setItem('theme','light') } catch(e){}
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const goToPopular = (e: React.MouseEvent) => {
    // navigate to homepage with hash so HomePage can scroll to section
    e.preventDefault();
    navigate('/#popular');
  }

  return (
    <nav className="navbar">

      <div className="logo">
        <span className="logo-box">B</span>
        ByteHive
      </div>

      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
  <li><a href="/#popular" onClick={goToPopular}>Popular</a></li>
        <li><Link to="/#about">About</Link></li>
        <li><Link to="/portal">Portal</Link></li>
      </ul>

      <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
        {darkMode ? "🌙" : "☀️"}
      </button>

    </nav>
  );
};

export default Navbar;