import React from "react";
import "./PopularCanteenCard.css";

interface Props{
name:string;
image:string;
}

const PopularCanteenCard:React.FC<Props> = ({name,image}) => {

return(
<div className="canteen-card">

<img src={image} alt={name}/>

<h3>{name}</h3>

</div>
)

}

export default PopularCanteenCard;