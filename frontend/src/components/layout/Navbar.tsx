import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
    } catch (e) {}
    return false;
  });

  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (blockRef.current && !blockRef.current.contains(event.target as Node)) {
        setIsBlockOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
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

  const toggleTheme = () => setDarkMode(prev => !prev);

  const goToPopular = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/#popular');
  }

  const handleBlockSelect = (filter: string) => {
    navigate(`/explore?filter=${encodeURIComponent(filter)}`);
    setIsBlockOpen(false);
  }

  return (
    <nav className="navbar">
      <div className="navbar-section left">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="logo-box">B</span>
          ByteHive
        </div>
      </div>

      <div className="navbar-section center">
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><a href="/#popular" onClick={goToPopular}>Popular</a></li>
          <li><Link to="/#about">About</Link></li>
          <li className="nav-item">
            <div className="dropdown-container" ref={blockRef}>
              <button 
                className={`nav-dropdown-btn ${isBlockOpen ? 'active' : ''}`}
                onClick={() => setIsBlockOpen(!isBlockOpen)}
              >
                Block <ChevronDown size={14} className={`chevron ${isBlockOpen ? 'rotate' : ''}`} />
              </button>
              
              {isBlockOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => handleBlockSelect('Block A')}>
                    <span className="block-icon icon-a">A</span>
                    <span className="item-text">Block A</span>
                  </div>
                  <div className="dropdown-item" onClick={() => handleBlockSelect('Block B')}>
                    <span className="block-icon icon-b">B</span>
                    <span className="item-text">Block B</span>
                  </div>
                  <div className="dropdown-item" onClick={() => handleBlockSelect('Dominos')}>
                    <div className="block-icon">
                      <img 
                        src="/images/dominosshortlogo.png" 
                        alt="Domino's" 
                        className="dominos-logo"
                      />
                    </div>
                    <span className="item-text">Dominos</span>
                  </div>
                </div>
              )}
            </div>
          </li>
          <li><Link to="/portal">Portal</Link></li>
        </ul>
      </div>

      <div className="navbar-section right">
        <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {darkMode ? "🌙" : "☀️"}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;