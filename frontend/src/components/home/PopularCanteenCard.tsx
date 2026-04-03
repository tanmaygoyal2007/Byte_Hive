import React from "react";
import { useNavigate } from "react-router-dom";
import "./PopularCanteenCard.css";
import { motion } from "framer-motion";

interface Props {
	id: string;
	name: string;
	image: string;
	description?: string;
  layout?: string;
}

const PopularCanteenCard: React.FC<Props> = ({ id, name, image, description, layout }) => {
	const navigate = useNavigate();

	const goToMenu = (e?: React.MouseEvent) => {
		if (e) e.preventDefault();
		navigate(`/menu/${id}`);
	}

	return (
		<motion.div 
      className={`canteen-card ${layout || 'quick'}`}
      onClick={goToMenu}
      whileHover="hover"
      initial="initial"
    >
			<div className="card-image-wrapper">
			  <motion.img 
          className="canteen-card-bg-img" 
          src={image} 
          alt={name} 
          variants={{
            initial: { filter: 'blur(15px) brightness(0.6)', scale: 1.1 },
            hover: { filter: 'blur(0px) brightness(0.9)', scale: 1 }
          }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
			</div>
			
			<div className="canteen-card-overlay"></div>

      <div className="card-content">
			  <h3>{name}</h3>
			  {description && <p className="desc">{description}</p>}
			  <button className="view-btn">View Menu &rarr;</button>
      </div>
		</motion.div>
	)
}

export default PopularCanteenCard;