import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
    } catch (e) { }
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
      try { localStorage.setItem('theme', 'dark') } catch (e) { }
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
      try { localStorage.setItem('theme', 'light') } catch (e) { }
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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="dominos-logo"
                        fill="currentColor"
                      >
                        <path d="M17.171 15.601c-.134 0-.262-.054-.356-.149L8.736 7.27c-.192-.194-.192-.507 0-.702l5.743-5.827c.943-.955 2.591-.955 3.534 0l5.258 5.324c.969.982.969 2.579 0 3.561l-5.744 5.827C17.434 15.547 17.305 15.601 17.171 15.601zM9.794 6.918l7.377 7.471 5.389-5.466c.587-.595.587-1.562 0-2.156l-5.258-5.324c-.564-.572-1.546-.572-2.11 0L9.794 6.918zM7.748 24.001c-.618 0-1.236-.231-1.719-.694l-5.291-5.075c-.979-.991-.979-2.588-.01-3.57l6.147-6.23c.188-.19.523-.19.712 0l8.08 8.182c.094.095.146.224.144.357-.001.134-.057.261-.153.354l-6.185 5.974C8.991 23.767 8.369 24.001 7.748 24.001zM7.232 9.495l-5.792 5.87c0 0 0 0 0 0-.587.594-.587 1.561 0 2.155l5.281 5.065c.578.555 1.482.553 2.058-.005l5.821-5.623L7.232 9.495zM1.084 15.014h.01H1.084z"></path>
                        <path d="M10.251 18.5c-1.104 0-2.001-.896-2.001-1.999 0-1.104.897-2.001 2-2.001.536 0 1.039.208 1.417.587.377.378.584.88.583 1.415.002.53-.204 1.032-.579 1.409C11.292 18.291 10.788 18.5 10.251 18.5zM10.25 15.5c-.551 0-1 .449-1 1.001 0 .551.449.999 1.001.999.269 0 .522-.105.711-.295.187-.188.289-.437.288-.702 0-.27-.103-.521-.291-.709C10.77 15.604 10.518 15.5 10.25 15.5zM5.001 18.5C3.897 18.5 3 17.604 3 16.501 3 15.398 3.897 14.5 5 14.5c.536 0 1.039.208 1.417.587.377.378.584.88.583 1.415.002.53-.204 1.032-.579 1.409C6.042 18.291 5.538 18.5 5.001 18.5zM5 15.5c-.551 0-1 .449-1 1.001C4 17.052 4.449 17.5 5.001 17.5c.269 0 .522-.105.711-.295C5.899 17.018 6.001 16.769 6 16.503c0-.27-.103-.521-.291-.709C5.52 15.604 5.268 15.5 5 15.5zM16.501 9.5c-1.104 0-2.001-.896-2.001-1.999 0-1.104.897-2.001 2-2.001.536 0 1.039.208 1.417.587.377.378.584.88.583 1.415.002.53-.204 1.032-.579 1.409C17.542 9.291 17.038 9.5 16.501 9.5zM16.5 6.5c-.551 0-1 .449-1 1.001 0 .551.449.999 1.001.999.269 0 .522-.105.711-.295.187-.188.289-.437.288-.702 0-.27-.103-.521-.291-.709C17.02 6.604 16.768 6.5 16.5 6.5z"></path>
                      </svg>
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