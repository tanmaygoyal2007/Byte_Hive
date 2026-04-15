import React from "react";
import { useNavigate } from "@/components/lib/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

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
            Explore More
            <FontAwesomeIcon icon={faArrowRight} className="explore-btn-arrow" aria-hidden="true" />
          </button>
        </div>
        <div className="food-grid">
          <div className="food-card food-card-tall">
            <img src="/images/FOOD1.jpg" alt="FOOD1" />
          </div>

          <div className="food-card food-card-offset">
            <img src="/images/FOOD2.jpg" alt="FOOD2" />
          </div>

          <div className="food-card">
            <img src="/images/FOOD3.jpg" alt="FOOD3" />
          </div>

          <div className="food-card food-card-offset-sm">
            <img src="/images/FOOD4.jpg" alt="FOOD4" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
