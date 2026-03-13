import React from "react";
import PopularCanteenCard from "./PopularCanteenCard";
import "./PopularCanteensSection.css";

const PopularCanteensSection:React.FC = () => {

return(

<section className="popular">

<h2>Popular Canteens</h2>

<div className="canteen-grid">

<PopularCanteenCard name="Central Canteen" image="/images/canteen1.jpg"/>
<PopularCanteenCard name="Food Court" image="/images/canteen2.jpg"/>
<PopularCanteenCard name="Campus Cafe" image="/images/canteen3.jpg"/>

</div>

</section>

)

}

export default PopularCanteensSection;