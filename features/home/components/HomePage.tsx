import React, { useEffect } from "react";

import HeroSection from "@/features/home/components/HeroSection";
import QuickDeliverySection from "@/features/home/components/QuickDeliverySection";
import PopularCanteensSection from "@/features/home/components/PopularCanteensSection";
import ContactSection from "@/features/home/components/ContactSection";
import Navbar from "@/components/components/layout/Navbar";
import Footer from "@/components/components/layout/Footer";
import { useLocation } from "@/components/lib/router";

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
        <HeroSection />
        <QuickDeliverySection />
        <PopularCanteensSection />
        <ContactSection />
        <div className="homepage-footer-divider" aria-hidden="true" />
        <Footer />
      </div>
    </>
  );
};

export default HomePage;
