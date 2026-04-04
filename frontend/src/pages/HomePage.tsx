import React, { useEffect } from "react";
import "./HomePage.css";

import HeroSection from "../components/home/HeroSection";
import QuickDeliverySection from "../components/home/QuickDeliverySection";
import PopularCanteensSection from "../components/home/PopularCanteensSection";
import ContactSection from "../components/home/ContactSection";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import BokehBackground from "../components/common/BokehBackground";
import { useLocation } from "react-router-dom";

const HomePage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [location]);

  return (
    <>
      <Navbar />
      <div className="homepage">
        <BokehBackground />
        
        {/* Main Content Layer */}
        <div className="content-layer">
          <HeroSection />
          <QuickDeliverySection />
          <PopularCanteensSection />
          <ContactSection />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default HomePage;