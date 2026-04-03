import React from "react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

import HeroSection from "../components/home/HeroSection";
import QuickDeliverySection from "../components/home/QuickDeliverySection";
import PopularCanteensSection from "../components/home/PopularCanteensSection";
import ContactSection from "../components/home/ContactSection";

const HomePage: React.FC = () => {
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