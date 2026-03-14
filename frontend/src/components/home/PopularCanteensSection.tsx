import React from "react";
import PopularCanteenCard from "./PopularCanteenCard";
import "./PopularCanteensSection.css";

const PopularCanteensSection:React.FC = () => {

	const popular = [
		{ id: 'punjabiBites', name: 'Punjabi Bites', image: '/images/punjabiBitesHomePageImg.png', description: 'Authentic North Indian Cuisine' },
		{ id: 'cafeCoffeeDay', name: 'Cafe Coffee Day', image: '/images/ccdHomePageImg.png', description: 'Premium Coffee & Quick Bites' },
		{ id: 'AmritsarHaveli', name: 'Amritsari Haveli', image: '/images/amritsariHaveliHomePageImg.png', description: 'Traditional Amritsari Flavors' },
	];

	return(
		<section id="popular" className="popular">
			<h2>Campus Popular Canteen</h2>
			<p className="subtitle">Explore the most loved dining spots across campus</p>

			<div className="canteen-grid">
				{popular.map(c => (
					<PopularCanteenCard key={c.id} id={c.id} name={c.name} image={c.image} description={c.description} />
				))}
			</div>
		</section>
	)
}

export default PopularCanteensSection;