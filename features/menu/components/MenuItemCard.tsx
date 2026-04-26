import { useEffect, useState, type CSSProperties } from "react";
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
import { getDisplayLabelsForItem } from "@/lib/utils/label-utils";
import { getOutletMetaById, getOutletIdByName } from "@/features/orders/services/order-portal.service";
import { getVendorOutletStatus, getVendorClosureLabel, subscribeToVendorStatus } from "@/features/vendor/services/vendor-portal.service";
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
  pickupPoint?: "counter" | "vendor_stall";
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
  const [isOutletOpen, setIsOutletOpen] = useState(() => (item.canteenId ? getVendorOutletStatus(outletName ?? "") : true));
  const [closureLabel, setClosureLabel] = useState<string | null>(() => (item.canteenId && outletName ? getVendorClosureLabel(outletName) : null));

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

  useEffect(() => {
    const syncVendorStatus = () => {
      if (!item.canteenId || !outletName) {
        setIsOutletOpen(true);
        setClosureLabel(null);
        return;
      }

      setIsOutletOpen(getVendorOutletStatus(outletName));
      setClosureLabel(getVendorClosureLabel(outletName));
    };

    syncVendorStatus();
    return subscribeToVendorStatus(syncVendorStatus);
  }, [item.canteenId, outletName]);

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
        item: { id: item.id, name: item.name, price: item.price, image: imageUrl, canteenId: item.canteenId, pickupPoint: item.pickupPoint },
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
      pickupPoint: item.pickupPoint,
    });
  };

  const fallbackDescription =
    item.description ||
    `${item.isVeg ? "Fresh vegetarian" : "Freshly prepared"} ${item.category?.toLowerCase() ?? "special"} item.`;

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

  const displayLabels = getDisplayLabelsForItem(item, item.canteenId);
  const showVendorStallBadge =
    item.pickupPoint === "vendor_stall" &&
    (item.canteenId === "punjabiBites" || item.canteenId === "southernDelights");

  return (
    <div className={`menu-item-card ${!canAdd ? "menu-item-unavailable" : ""}`}>
      {!isItemAvailable && <div className="menu-item-unavailable-overlay">Unavailable</div>}
      <div className="menu-item-image-wrap">
        <img className="menu-item-image" src={imageUrl || "/images/CANTEEN1.jpg"} alt={item.name} />
        {item.isVeg !== undefined && (
          <span className={`menu-item-food-type ${item.isVeg ? "veg" : "non-veg"}`} aria-label={item.isVeg ? "Vegetarian" : "Non-vegetarian"}>
            {item.isVeg ? "●" : "■"}
          </span>
        )}
      </div>
      <div className="menu-item-body">
        <div className="menu-item-copy">
          <div className="menu-item-title-row">
            <h4 className="menu-item-title">{item.name}</h4>
            {showVendorStallBadge && <span className="menu-item-stall-pill">Pick up at Vendor Stall</span>}
          </div>
          <p className="menu-item-desc">{fallbackDescription}</p>
          {displayLabels.length > 0 && (
            <div className="menu-item-labels">
              {displayLabels.map((label) => {
                return (
                  <span
                    key={label.id}
                    className="menu-item-label"
                    title={label.description}
                    style={{ "--label-color": label.color } as CSSProperties}
                  >
                    <span className="menu-item-label-dot" />
                    {label.name}
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
