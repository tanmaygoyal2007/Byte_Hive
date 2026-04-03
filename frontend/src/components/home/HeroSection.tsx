import React, { useRef, useState } from "react";
import "./HeroSection.css";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // High-End 4-Card Grid Assets
  const images = [
    '/images/redesign/FOOD1.jpg',
    '/images/redesign/FOOD2.jpg',
    '/images/redesign/FOOD3.jpg',
    '/images/redesign/FOOD4.jpg'
  ];

  // Magnetic Logic States
  const bx = useMotionValue(0);
  const by = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 150, mass: 0.1 };
  const magneticX = useSpring(bx, springConfig);
  const magneticY = useSpring(by, springConfig);

  // Cursor Aura Tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 30, stiffness: 100 });
  const smoothMouseY = useSpring(mouseY, { damping: 30, stiffness: 100 });
  
  // Parallax Logic
  const parallaxX = useTransform(mouseX, [0, typeof window !== "undefined" ? window.innerWidth : 1000], [20, -20]);
  const parallaxY = useTransform(mouseY, [0, typeof window !== "undefined" ? window.innerHeight : 1000], [20, -20]);
  const smoothParallaxX = useSpring(parallaxX, { damping: 30, stiffness: 100 });
  const smoothParallaxY = useSpring(parallaxY, { damping: 30, stiffness: 100 });

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
    
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const distanceX = e.clientX - (rect.left + rect.width / 2);
      const distanceY = e.clientY - (rect.top + rect.height / 2);
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      if (distance < 250) {
        bx.set(distanceX * 0.35);
        by.set(distanceY * 0.35);
      } else {
        bx.set(0);
        by.set(0);
      }
    }
  };

  const handleMouseLeave = () => {
    bx.set(0); 
    by.set(0);
  };

  const goExplore = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    navigate('/explore');
  };

  const headlineWords = ["Get", "a", "quick", "idea", "about", "your", "daily meals"];

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const wordVariants: any = {
    hidden: { opacity: 0, y: 30, filter: 'blur(15px)', scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      scale: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <section 
      ref={heroRef} 
      className="hero" 
      onMouseMove={handleMouseMove} 
      onMouseLeave={handleMouseLeave}
    >
      <motion.div 
        className="aura-glow"
        style={{ left: smoothMouseX, top: smoothMouseY }}
      ></motion.div>

      <div className="hero-grid-layout">
        
        {/* Left Side: Premium Typography & CTA */}
        <div className="hero-left">
          <motion.h1 
            className="hero-h1"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {headlineWords.map((word, i) => (
              <motion.span 
                key={i}
                className={`word-stack ${word === "daily meals" ? "accent-gradient" : ""}`}
                variants={wordVariants}
              >
                {word}&nbsp;
              </motion.span>
            ))}
          </motion.h1>
          
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
          >
            Discover what's cooking in your campus canteens. Browse menus,
            check availability, and plan your meals safely — all in one
            immersive place.
          </motion.p>
          
          <div className="hero-cta-wrap">
            <motion.button 
              ref={btnRef} 
              className="premium-btn Apple-btn" 
              onClick={goExplore}
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.8 }} 
              viewport={{ once: true }}
              style={{ x: magneticX, y: magneticY }}
            >
              <span className="btn-text">Explore More</span>
              <span className="btn-arrow">→</span>
            </motion.button>
          </div>
        </div>

        {/* Right Side: Cinematic Grid Gallery */}
        <div className="hero-right">
          <motion.div 
            className="hero-image-container"
            style={{ x: smoothParallaxX, y: smoothParallaxY }}
          >
            {images.map((src, index) => (
              <div key={index} className="hero-image-card">
                <img src={src} alt={`Gourmet Food ${index + 1}`} className="premium-img" />
                <div className="img-overlay-glow"></div>
              </div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;