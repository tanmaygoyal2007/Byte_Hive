import { MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import "./CanteenCard.css";
import "./canteens.ts";
// Accept a loose prop shape so we can pass data from data/canteens.json
export function CanteenCard(props: any) {
    const { id, name, description, rating, block, images } = props;
    // override images for specific canteens using supplied logo assets
    const overrides: Record<string, string> = {
        'amritsari': '/images/amritsariHaveliLogo.png',
        'amritsar': '/images/amritsariHaveliLogo.png',
        'bites': '/images/bitesAndBrewsLogo.png',
        'bites & brews': '/images/bitesAndBrewsLogo.png',
        'taste of delhi': '/images/tasteOfDelhiLogo.png',
        'southern': '/images/SouthernDelightLogo.png',
        'rolls': '/images/rollsLaneLogo.png',
        'punjabi': '/images/punjabiBitesLogo.png',
        'gianis': '/images/Gianis.png',
        "domino": '/images/dominosLogo.png',
        'ccd': '/images/CCD.jpg',
    };

    const nameKey = (name || '').toLowerCase();
    let image = images && images.length ? images[0] : "/placeholder.svg";
    for (const key of Object.keys(overrides)){
        if (nameKey.includes(key)){
            image = overrides[key];
            break;
        }
    }

    return (
        <Link to={`/menu/${id}`} className="card-link">
            <article className="card-wrap">

                <div className="card-image-container">
                    <img src={image || "/placeholder.svg"} alt={name} className="card-img" />
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