import React from "react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import React, { useEffect } from "react";
import "./HomePage.css";

import HeroSection from "../components/home/HeroSection";
import QuickDeliverySection from "../components/home/QuickDeliverySection";
import PopularCanteensSection from "../components/home/PopularCanteensSection";
import ContactSection from "../components/home/ContactSection";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useLocation } from "react-router-dom";

const HomePage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // if there's a hash, scroll to the element with that id
    if (location.hash) {
      const id = location.hash.replace('#','');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [location]);

  return (
    <div>
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