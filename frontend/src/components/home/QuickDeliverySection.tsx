import React from "react";
import "./QuickDeliverySection.css";
import { useNavigate } from "react-router-dom";
import { CANTEENS } from "../canteens/canteens";

const QuickDeliverySection: React.FC = () => {
    const navigate = useNavigate();
    const orderNow = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const firstId = CANTEENS[0]?.id || 'punjabiBites';
        navigate(`/menu/${firstId}`);
    }

    return (

        <section className="delivery">

            <div className="delivery-text">

                <h2>Quick Delivery</h2>

                <p>
                    Order food from your favourite campus canteen and
                    get it delivered quickly without waiting in long lines.
                </p>

                <button onClick={orderNow}>Order Now</button>

            </div>

            <img src="/images/FOOD5.jpg" alt="FOOD5" className="delivery-img" />

        </section>

    )

}

export default QuickDeliverySection;