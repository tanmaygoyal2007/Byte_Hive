import React, { useState } from "react";
import "./Navbar.css";

const Navbar: React.FC = () => {

  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => {
    setDarkMode(!darkMode);

    if (!darkMode) {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
  };

  return (
    <nav className="navbar">

      <div className="logo">
        <span className="logo-box">B</span>
        ByteHive
      </div>

      <ul className="nav-links">
        <li>Home</li>
        <li>Popular</li>
        <li>About</li>
        <li>Portal</li>
      </ul>

      <button className="theme-btn" onClick={toggleTheme}>
        {darkMode ? "🌙" : "☀️"}
      </button>

    </nav>
  );
};

export default Navbar;