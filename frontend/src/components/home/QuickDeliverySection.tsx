import React from "react";
import "./QuickDeliverySection.css";

const QuickDeliverySection:React.FC = () => {

return(

<section className="delivery">

<div className="delivery-text">

<h2>Quick Delivery</h2>

<p>
Order food from your favourite campus canteen and
get it delivered quickly without waiting in long lines.
</p>

<button>Order Now</button>

</div>

<img src="/images/delivery.jpg" className="delivery-img"/>

</section>

)

}

export default QuickDeliverySection;