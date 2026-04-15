import React from "react";
import { useNavigate } from "@/components/lib/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faClock } from "@fortawesome/free-solid-svg-icons";

const QuickDeliverySection: React.FC = () => {
    const navigate = useNavigate();
    const orderNow = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        navigate("/cart");
    }

    return (
        <section className="delivery">
            <div className="delivery-inner">
              <div className="delivery-text">
                  <span className="delivery-kicker">Food delivery</span>
                  <h2>Quick & Easy<br />Campus Dining</h2>

                  <p>
                      Skip the lines and order ahead. Get your favorite meals delivered right
                      to your location on campus. Fast, convenient, and always fresh.
                  </p>

                  <button className="delivery-order-btn" onClick={orderNow}>
                    <FontAwesomeIcon icon={faBagShopping} className="delivery-order-icon" aria-hidden="true" />
                    Order Now
                  </button>

                  <div className="delivery-meta">
                    <span className="delivery-meta-icon" aria-hidden="true">
                      <FontAwesomeIcon icon={faClock} />
                    </span>
                    15-20 min delivery
                  </div>
              </div>

              <div className="delivery-visual">
                <div className="delivery-chip delivery-chip-top">
                  <img src="/images/FOOD5.jpg" alt="Fries" />
                </div>
                <img src="/images/FOOD1.jpg" alt="Burger meal" className="delivery-img" />
                <div className="delivery-chip delivery-chip-mid">
                  <img src="/images/FOOD3.jpg" alt="Dessert scoop" />
                </div>
                <div className="delivery-chip delivery-chip-bottom">
                  <img src="/images/CCD.jpg" alt="Cold drink" />
                </div>
              </div>
            </div>
        </section>

    )

}

export default QuickDeliverySection;
