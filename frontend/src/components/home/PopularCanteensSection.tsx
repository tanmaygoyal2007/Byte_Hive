import React, { useState, useEffect, useRef } from "react";
import PopularCanteenCard from "./PopularCanteenCard";
import "./PopularCanteensSection.css";

const PopularCanteensSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const popular = [
    {
      id: "punjabiBites",
      name: "Featured: North Indian Thali",
      image: "/images/redesign/punjabi.jpg",
      description: "Experience the authentic flavors of a complete North Indian meal, freshly prepared and traditionally served.",
      layout: "featured"
    },
    {
      id: "cafeCoffeeDay",
      name: "Quick Pick: CCD",
      image: "/images/redesign/cafe.jpg",
      description: "Gourmet coffee and quick snacks for your busy campus life.",
      layout: "quick"
    },
    {
      id: "AmritsarHaveli",
      name: "Quick Pick: Haveli",
      image: "/images/redesign/amritsari.jpg",
      description: "The legendary taste of Amritsari Kulcha and more.",
      layout: "quick"
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="popular" ref={sectionRef} className={`popular ${isVisible ? 'visible' : ''}`}>
      <div className="popular-container">
        <div className="section-header">
          <h2 className="glow-text">Campus Popular Canteens</h2>
          <p className="subtitle">Explore curated dining experiences across campus</p>
        </div>

        <div className="canteen-bento-grid">
          {popular.map((c) => (
            <PopularCanteenCard
              key={c.id}
              id={c.id}
              name={c.name}
              image={c.image}
              description={c.description}
              layout={c.layout}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularCanteensSection;