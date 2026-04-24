import { useEffect, useMemo, useState } from "react";
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
import { getOutletMetaById, getOutletIdByName } from "@/features/orders/services/order-portal.service";
import { getVendorOutletStatus, getVendorClosureLabel } from "@/features/vendor/services/vendor-portal.service";
import { useOutletSwitch } from "@/features/cart/components/OutletSwitchContext";

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
  const { addItem, state } = useCart();
  const { showConfirm } = useOutletSwitch();
  const [session, setSession] = useState<UserSession | null>(() => getCurrentUserSession());
  const [isFavorite, setIsFavorite] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const isItemAvailable = item.isAvailable !== false;
  const imageUrl = resolveMenuImageUrl(item.image);

  const outletName = item.canteenId ? getOutletMetaById(item.canteenId)?.name : null;
  const isOutletOpen = item.canteenId ? getVendorOutletStatus(outletName ?? "") : true;
  const closureLabel = item.canteenId && outletName ? getVendorClosureLabel(outletName) : null;

  const canAdd = isItemAvailable && isOutletOpen;

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

  const handleAddClick = () => {
    setAddError(null);

    if (!isItemAvailable) return;

    if (!isOutletOpen) {
      setAddError(closureLabel ? `${outletName} is currently closed. ${closureLabel}` : `${outletName} is currently closed and not accepting orders.`);
      return;
    }

    const currentCartOutletId = state.items[0]?.canteenId;
    const newOutletId = item.canteenId;
    if (currentCartOutletId && newOutletId && currentCartOutletId !== newOutletId && state.items.length > 0) {
      showConfirm({
        item: { id: item.id, name: item.name, price: item.price, image: imageUrl, canteenId: item.canteenId },
        currentOutletName: getOutletMetaById(currentCartOutletId)?.name ?? "another outlet",
        newOutletName: getOutletMetaById(newOutletId)?.name ?? "this outlet",
        itemCount: state.items.length,
      });
      return;
    }
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: imageUrl,
      canteenId: item.canteenId,
    });
  };

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
    <div className={`menu-item-card ${!canAdd ? "menu-item-unavailable" : ""}`}>
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
              <button className="menu-item-add" type="button" onClick={handleAddClick} disabled={!canAdd}>
                {isOutletOpen ? "Add to Cart" : "Closed"}
              </button>
            </div>
          )}
        </div>
        {addError && <p className="menu-item-error">{addError}</p>}
      </div>
    </div>
  );
}

export default MenuItemCard;
