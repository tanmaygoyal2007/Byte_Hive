import React, { useEffect, useState } from "react";
import { useNavigate } from "@/components/lib/router";
import { getVendorOutletStatus, subscribeToVendorStatus } from "@/features/vendor/services/vendor-portal.service";

interface Props {
	id: string;
	name: string;
	image: string;
	description?: string;
}

const PopularCanteenCard: React.FC<Props> = ({ id, name, image, description }) => {
	const navigate = useNavigate();
	const [isOpen, setIsOpen] = useState(() => getVendorOutletStatus(name));

	useEffect(() => {
		const syncVendorStatus = () => setIsOpen(getVendorOutletStatus(name));
		syncVendorStatus();
		return subscribeToVendorStatus(syncVendorStatus);
	}, [name]);

	const goToMenu = (e?: React.MouseEvent) => {
		if (e) e.preventDefault();
		navigate(`/canteens/${id}`);
	}

	return (
		<article className="canteen-card">
			<div className="canteen-card-media">
				<img src={image} alt={name} />
				{!isOpen && <span className="popular-closed-tag">Closed</span>}
			</div>
			<h3>{name}</h3>
			{description && <p className="desc">{description}</p>}
			<button className="view-btn" onClick={goToMenu}>View Menu <span aria-hidden="true">→</span></button>
		</article>
	)

}

export default PopularCanteenCard;
