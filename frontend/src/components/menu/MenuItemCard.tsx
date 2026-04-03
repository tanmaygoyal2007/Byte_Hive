import "./MenuItemCard.css";
import { useState } from "react";
import useCart from "../../hooks/useCart";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  description?: string;
}

function MenuItemCard({ item }: { item: MenuItem }) {
    const { addItem } = useCart();
    const [isFavorite, setIsFavorite] = useState(false);

    const handleAdd = () => {
        addItem({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image
        });
    }

    // The menu dataset is inconsistent about descriptions, so we synthesize a readable fallback.
    const fallbackDescription = item.description
        || `${item.isVeg ? "Fresh vegetarian" : "Freshly prepared"} ${item.category?.toLowerCase() ?? "special"} item.`;

    return(
        <div className="menu-item-card">
            <img className="menu-item-image" src={item.image || '/images/tasteOfDelhi/tandoori-paneer-tikka.jpg'} alt={item.name} />
            <div className="menu-item-body">
                <div className="menu-item-copy">
                    <h4 className="menu-item-title">{item.name}</h4>
                    <p className="menu-item-desc">{fallbackDescription}</p>
                </div>
                <div className="menu-item-controls">
                    <div className="menu-item-price">₹{item.price}</div>
                    <div className="menu-item-actions">
                        <button
                            className="menu-item-fav"
                            type="button"
                            aria-label={`Save ${item.name}`}
                            onClick={() => setIsFavorite((current) => !current)}
                        >
                            <span
                                className={`menu-item-fav-icon${isFavorite ? " menu-item-fav-icon-active" : ""}`}
                            >
                                {isFavorite ? "★" : "☆"}
                            </span>
                        </button>
                        <button className="menu-item-add" type="button" onClick={handleAdd}>+ Add</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MenuItemCard;
