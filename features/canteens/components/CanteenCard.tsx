import { MapPin, Star } from "lucide-react";
import { Link } from "@/components/lib/router";
import type { Canteen } from "./canteens";
import { getVendorOutletStatus, getVendorClosureLabel } from "@/features/vendor/services/vendor-portal.service";

export function CanteenCard(props: Canteen) {
    const { id, name, description, rating, block, images, logo } = props;

    const image = images && images.length ? images[0] : "/placeholder.svg";
    const isOpen = getVendorOutletStatus(name);
    const closureLabel = getVendorClosureLabel(name);

    return (
        <Link to={`/canteens/${id}`} className="card-link">
            <article className="card-wrap">

                <div className="card-image-container">
                    <img src={image || "/placeholder.svg"} alt={name} className="card-img" />
                    {logo && (
                        <div className="card-logo-badge">
                            <img src={logo} alt={`${name} logo`} className="card-logo-img" />
                        </div>
                    )}
                    {!isOpen && (
                        <div className="card-closed-tag">Closed</div>
                    )}
                </div>

                <div className="card-body">
                    <h3 className="card-name">{name}</h3>
                    <p className="card-cuisine">{description}</p>

                    <div className="card-footer">
                        <div className="card-rating">
                            <Star size={16} fill="#f97316" color="#f97316" />
                            <span className="card-rating-text">{rating}</span>
                        </div>

                        <div className="card-location">
                            <MapPin size={16} color="#9ca3af" />
                            <span className="card-location-text">{block}</span>
                        </div>
                    </div>
                </div>

            </article>
        </Link>
    );
}
