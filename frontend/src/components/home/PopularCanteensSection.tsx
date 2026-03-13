import React from "react";
import PopularCanteenCard from "./PopularCanteenCard";
import "./PopularCanteensSection.css";

const PopularCanteensSection:React.FC = () => {

return(

<section className="popular">

<h2>Popular Canteens</h2>

<div className="canteen-grid">

<PopularCanteenCard name="Central Canteen" image="/images/CANTEEN1.jpg"/>
<PopularCanteenCard name="Food Court" image="/images/CANTEEN2.jpg"/>
<PopularCanteenCard name="Campus Cafe" image="/images/CANTEEN3.jpg"/>

</div>

</section>

)

}

export default PopularCanteensSection;