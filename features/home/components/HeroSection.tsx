import React, { useEffect, useState } from "react";
import { useNavigate } from "@/components/lib/router";
import { ArrowRight } from "lucide-react";

const HERO_IMAGES = [
  { src: "/images/FOOD1.jpg", alt: "FOOD1", className: "food-card food-card-tall" },
  { src: "/images/FOOD2.jpg", alt: "FOOD2", className: "food-card food-card-offset" },
  { src: "/images/FOOD3.jpg", alt: "FOOD3", className: "food-card" },
  { src: "/images/FOOD4.jpg", alt: "FOOD4", className: "food-card food-card-offset-sm" },
] as const;

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [imagesReady, setImagesReady] = useState(false);
  const [visibleImageCount, setVisibleImageCount] = useState(0);

  useEffect(() => {
    let active = true;
    let settled = 0;

    const markSettled = () => {
      settled += 1;
      if (active && settled === HERO_IMAGES.length) {
        setImagesReady(true);
      }
    };

    HERO_IMAGES.forEach(({ src }) => {
      const img = new Image();
      img.onload = () => { if (active) markSettled(); };
      img.onerror = () => { if (active) markSettled(); };
      img.src = src;
      if (img.complete) markSettled();
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!imagesReady) return;

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setVisibleImageCount(current);
      if (current >= HERO_IMAGES.length) clearInterval(interval);
    }, 180);

    return () => clearInterval(interval);
  }, [imagesReady]);

  const goExplore = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    navigate('/canteens');
  }

  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-text">
          <span className="hero-kicker">
            <span className="hero-kicker-dot" aria-hidden="true" />
            Campus food guide
          </span>
          <h1>
            Get a quick <br />
            idea about your <br />
            <span>daily meals</span>
          </h1>

          <p>
            Discover what's cooking in your campus canteens. Browse menus,
            check availability, and plan your meals easily — all in one
            convenient place.
          </p>

          <button className="explore-btn" onClick={goExplore}>
            <span className="explore-btn-label">Explore More</span>
            <ArrowRight className="explore-btn-arrow" aria-hidden="true" size={28} strokeWidth={2.6} />
          </button>
        </div>
        <div className={`food-grid${imagesReady ? " food-grid-ready" : ""}`}>
          {HERO_IMAGES.map((image, index) => (
            <div
              key={image.src}
              className={`${image.className}${visibleImageCount > index ? " food-card-visible" : ""}`}
            >
              <img
                src={image.src}
                alt={image.alt}
                loading="eager"
                fetchPriority="high"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;