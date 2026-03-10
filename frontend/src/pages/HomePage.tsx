import React from "react";
import "./HomePage.css";

import HeroSection from "../components/home/HeroSection";
import QuickDeliverySection from "../components/home/QuickDeliverySection";
import PopularCanteensSection from "../components/home/PopularCanteensSection";
import ContactSection from "../components/home/ContactSection";

const HomePage: React.FC = () => {
  return (
    <div className="homepage">
      <HeroSection />
      <QuickDeliverySection />
      <PopularCanteensSection />
      <ContactSection />
    </div>
  );
};

export default HomePage;