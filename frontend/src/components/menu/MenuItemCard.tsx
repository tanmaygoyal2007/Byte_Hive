import { useEffect, useState } from "react";
import useCart from "../../hooks/useCart";
import {
  getCurrentUserSession,
  requestAuthPrompt,
  subscribeToUserSession,
  type UserSession,
} from "../../utils/orderPortal";
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

function MenuItemCard({ item, isOutletOpen = true }: { item: MenuItem; isOutletOpen?: boolean }) {
  const { addItem } = useCart();
  const [session, setSession] = useState<UserSession | null>(() => getCurrentUserSession());
  const isItemAvailable = item.isAvailable !== false;

  useEffect(() => {
    const syncSession = () => setSession(getCurrentUserSession());
    return subscribeToUserSession(syncSession);
  }, []);

  const handleAdd = () => {
    if (!session) {
      requestAuthPrompt({ reason: "add-to-cart", role: "student" });
      return;
    }

    if (!isItemAvailable || !isOutletOpen) return;

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      canteenId: item.canteenId,
    });
  };

  return (
    <div className="menu-item-card">
      <img
        className="menu-item-image"
        src={item.image || "/images/tasteOfDelhi/tandoori-paneer-tikka.jpg"}
        alt={item.name}
      />
      <div className="menu-item-body">
        <h4 className="menu-item-title">{item.name}</h4>
        <p className="menu-item-desc">{item.description || "Delicious item"}</p>
        <div className="menu-item-controls">
          <div className="menu-item-price">Rs {item.price}</div>
          <button
            className="menu-item-add"
            onClick={handleAdd}
            disabled={isItemAvailable ? !isOutletOpen : true}
          >
            {!session ? "Login to Add" : isOutletOpen ? (isItemAvailable ? "+ Add" : "Unavailable") : "Outlet Closed"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuItemCard;
