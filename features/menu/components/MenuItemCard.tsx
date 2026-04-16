import { useEffect, useState, useMemo } from "react";
import useCart from "@/features/cart/hooks/useCart";
import {
  getCurrentUserSession,
  isFavoriteItemForUser,
  requestAuthPrompt,
  subscribeToFavorites,
  subscribeToUserSession,
  toggleFavoriteItemForUser,
  type UserSession,
} from "@/features/orders/services/order-portal.service";
import { resolveMenuImageUrl } from "@/features/menu/services/menu-image.service";
import { getLabelColorsForCanteen } from "@/lib/utils/label-utils";

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
  labels?: string[];
};

function MenuItemCard({ item, previewOnly = false }: { item: MenuItem; previewOnly?: boolean }) {
  const { addItem } = useCart();
  const [session, setSession] = useState<UserSession | null>(() => getCurrentUserSession());
  const [isFavorite, setIsFavorite] = useState(false);
  const isItemAvailable = item.isAvailable !== false;
  const imageUrl = resolveMenuImageUrl(item.image);

  const labelColors = useMemo(() => {
    return getLabelColorsForCanteen(item.canteenId);
  }, [item.canteenId]);

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
    <div className={`menu-item-card ${isItemAvailable ? "" : "menu-item-unavailable"}`}>
      {!isItemAvailable && <div className="menu-item-unavailable-overlay">Unavailable</div>}
      <img className="menu-item-image" src={imageUrl || "/images/CANTEEN1.jpg"} alt={item.name} />
      <div className="menu-item-body">
        <div className="menu-item-copy">
          <h4 className="menu-item-title">{item.name}</h4>
          <p className="menu-item-desc">{fallbackDescription}</p>
          {item.labels && item.labels.length > 0 && (
            <div className="menu-item-labels">
              {item.labels.map((label) => {
                const color = labelColors[label.toLowerCase()] || "var(--accent)";
                return (
                  <span
                    key={label}
                    className="menu-item-label"
                    style={{ "--label-color": color } as React.CSSProperties}
                  >
                    <span className="menu-item-label-dot" />
                    {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="menu-item-controls">
          <div className="menu-item-price">Rs {item.price}</div>
          {!previewOnly && (
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
                Add to Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MenuItemCard;
