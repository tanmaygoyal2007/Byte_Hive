import React from "react";
import "./HeroSection.css";

const HeroSection: React.FC = () => {
  return (
    <section className="hero">

      <div className="hero-container">
        
        <div className="hero-text">

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

          <button className="explore-btn">
            Explore More →
          </button>

        </div>

        <div className="food-grid">

          <div className="food-card">
            <img src="/images/FOOD1.jpg" alt="FOOD1" />
          </div>

          <div className="food-card">
            <img src="/images/FOOD2.jpg" alt="FOOD2" />
          </div>

          <div className="food-card">
            <img src="/images/FOOD3.jpg" alt="FOOD3" />
          </div>

          <div className="food-card">
            <img src="/images/FOOD4.jpg" alt="FOOD4" />
          </div>

        </div>

      </div>

    </section>
  );
};

export default HeroSection;