import React from "react";
import "./HomePage.css";

import HeroSection from "../components/home/HeroSection";
import QuickDeliverySection from "../components/home/QuickDeliverySection";
import PopularCanteensSection from "../components/home/PopularCanteensSection";
import ContactSection from "../components/home/ContactSection";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const HomePage: React.FC = () => {
  return (
    <div className="homepage">
      <Navbar />
      <HeroSection />
      <QuickDeliverySection />
      <PopularCanteensSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default HomePage;