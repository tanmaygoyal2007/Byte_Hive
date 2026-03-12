import { MapPin, Star } from "lucide-react";
import type { Canteen } from "./canteens"

export function CanteenCard({ id, name, cuisine, rating, location, image }: Canteen) {
    return (
        <a href={`/canteens/${id}`} className="card-link">
            <article className="card-wrap">

                <div className="card-image-container">
                    <img src={image || "/placeholder.svg"} alt={name} className="card-img" />
                </div>

                <div className="card-body">
                    <h3 className="card-name">{name}</h3>
                    <p className="card-cuisine">{cuisine}</p>

                    <div className="card-footer">
                        <div className="card-rating">
                            <Star size={16} fill="#f97316" color="#f97316" />
                            <span className="card-rating-text">{rating}</span>
                        </div>

                        <div className="card-location">
                            <MapPin size={16} color="#9ca3af" />
                            <span className="card-location-text">{location}</span>
                        </div>
                    </div>
                </div>

            </article>
        </a>
    );
}