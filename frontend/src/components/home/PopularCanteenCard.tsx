import React from "react";
import { useNavigate } from "react-router-dom";
import "./PopularCanteenCard.css";

interface Props{
	id: string;
	name:string;
	image:string;
	description?: string;
}

const PopularCanteenCard:React.FC<Props> = ({id, name, image, description}) => {
	const navigate = useNavigate();

	const goToMenu = (e?: React.MouseEvent) => {
		if (e) e.preventDefault();
		navigate(`/menu/${id}`);
	}

	return(
		<div className="canteen-card">

			<img src={image} alt={name}/>

			<h3>{name}</h3>

			{description && <p className="desc">{description}</p>}

			<button className="view-btn" onClick={goToMenu}>View Menu →</button>

		</div>
	)

}

export default PopularCanteenCard;