import { useEffect, useState } from "react";
import useCart from "../../hooks/useCart";
import {
  getCurrentUserSession,
  isFavoriteItemForUser,
  requestAuthPrompt,
  subscribeToFavorites,
  subscribeToUserSession,
  toggleFavoriteItemForUser,
  type UserSession,
} from "../../utils/orderPortal";
import { resolveMenuImageUrl } from "../../utils/menuImage";
import "./MenuItemCard.css";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  canteenId?: string;
  image?: string;
  category?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  description?: string;
};

function MenuItemCard({ item }: { item: MenuItem }) {
  const { addItem } = useCart();
  const [session, setSession] = useState<UserSession | null>(() => getCurrentUserSession());
  const [isFavorite, setIsFavorite] = useState(false);
  const isItemAvailable = item.isAvailable !== false;
  const imageUrl = resolveMenuImageUrl(item.image);

  const fallbackDescription =
    item.description ||
    `${item.isVeg ? "Fresh vegetarian" : "Freshly prepared"} ${item.category?.toLowerCase() ?? "special"} item.`;

  useEffect(() => {
    const syncSession = () => setSession(getCurrentUserSession());
    return subscribeToUserSession(syncSession);
  }, []);

  useEffect(() => {
    const syncFavorite = () => {
      setIsFavorite(session?.userName ? isFavoriteItemForUser(session.userName, item.id) : false);
    };

    syncFavorite();
    return subscribeToFavorites(syncFavorite);
  }, [item.id, session?.userName]);

  const handleAdd = () => {
    if (!isItemAvailable) return;

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: imageUrl,
      canteenId: item.canteenId,
    });
  };

  const handleFavoriteToggle = () => {
    if (!session) {
      requestAuthPrompt({ reason: "upgrade-guest", role: "student" });
      return;
    }

    toggleFavoriteItemForUser(session.userName, {
      id: item.id,
      canteenId: item.canteenId ?? "",
      name: item.name,
      price: item.price,
      category: item.category ?? "Featured",
      image: item.image,
      description: item.description,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable !== false,
    });
  };

  return (
    <div className="menu-item-card">
      <img className="menu-item-image" src={imageUrl || "/images/CANTEEN1.jpg"} alt={item.name} />
      <div className="menu-item-body">
        <div className="menu-item-copy">
          <h4 className="menu-item-title">{item.name}</h4>
          <p className="menu-item-desc">{fallbackDescription}</p>
        </div>
        <div className="menu-item-controls">
          <div className="menu-item-price">Rs {item.price}</div>
          <div className="menu-item-actions">
            <button
              className="menu-item-fav"
              type="button"
              aria-label={`${isFavorite ? "Remove" : "Save"} ${item.name} as favorite`}
              onClick={handleFavoriteToggle}
            >
              <span className={`menu-item-fav-icon${isFavorite ? " menu-item-fav-icon-active" : ""}`}>
                {isFavorite ? "★" : "☆"}
              </span>
            </button>
            <button className="menu-item-add" type="button" onClick={handleAdd} disabled={!isItemAvailable}>
              {isItemAvailable ? "Add to Cart" : "Unavailable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MenuItemCard;
