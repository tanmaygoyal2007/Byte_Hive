import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import ChatWidget from "./components/chatWidget/ChatWidget";
import type { ChatAction } from "./hooks/useChat";
import useCart from "./hooks/useCart";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppRoutes from "./routes/AppRoutes";
import {
  adjustMenuItemsPriceByPercent,
  createMenuItemForOutlet,
  getActiveOrdersForUser,
  getOrdersForOutlet,
  getAllMenuItems,
  getCurrentUserSession,
  getOutletMetaById,
  getOrderDelayCopy,
  setMenuItemsAvailability,
  setMenuItemsPrice,
  subscribeToMenu,
  subscribeToOrders,
  subscribeToUserSession,
  type MenuCatalogItem,
  type UserSession,
} from "./utils/orderPortal";
import {
  clearVendorTemporaryClosure,
  getVendorClosureLabel,
  getVendorLocation,
  getVendorOutlet,
  getVendorOutletId,
  getVendorOutletStatusInfo,
  setVendorTemporaryClosure,
  subscribeToVendorSession,
  subscribeToVendorStatus,
} from "./utils/vendorPortal";

function getTodayKey() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

function formatCurrency(value: number) {
  return `Rs ${Math.round(value * 100) / 100}`;
}

function AppShell() {
  const location = useLocation();
  const { state: cartState, addItem } = useCart();
  const [menuItems, setMenuItems] = useState<MenuCatalogItem[]>(() => getAllMenuItems());
  const [userSession, setUserSession] = useState<UserSession | null>(() => getCurrentUserSession());
  const [activeOrders, setActiveOrders] = useState(() =>
    userSession?.userName ? getActiveOrdersForUser(userSession.userName) : []
  );
  const [vendorOutlet, setVendorOutlet] = useState(() => getVendorOutlet());
  const [vendorClosureLabel, setVendorClosureLabel] = useState<string | null>(() => {
    const outlet = getVendorOutlet();
    return outlet ? getVendorClosureLabel(outlet) : null;
  });
  const [vendorOrders, setVendorOrders] = useState(() => {
    const outlet = getVendorOutlet();
    return outlet ? getOrdersForOutlet(outlet) : [];
  });

  useEffect(() => {
    const syncMenu = () => setMenuItems(getAllMenuItems());
    return subscribeToMenu(syncMenu);
  }, []);

  useEffect(() => {
    const syncUserSession = () => setUserSession(getCurrentUserSession());
    return subscribeToUserSession(syncUserSession);
  }, []);

  useEffect(() => {
    const syncOrders = () => {
      if (!userSession?.userName) {
        setActiveOrders([]);
      } else {
        setActiveOrders(getActiveOrdersForUser(userSession.userName));
      }

      const outlet = getVendorOutlet();
      setVendorOrders(outlet ? getOrdersForOutlet(outlet).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : []);
    };

    syncOrders();
    return subscribeToOrders(syncOrders);
  }, [userSession?.userName]);

  useEffect(() => {
    const syncVendorSession = () => {
      const outlet = getVendorOutlet();
      setVendorOutlet(outlet);
      setVendorClosureLabel(outlet ? getVendorClosureLabel(outlet) : null);
      setVendorOrders(outlet ? getOrdersForOutlet(outlet).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : []);
    };

    syncVendorSession();
    return subscribeToVendorSession(syncVendorSession);
  }, []);

  useEffect(() => {
    const syncVendorStatus = () => {
      const outlet = getVendorOutlet();
      setVendorClosureLabel(outlet ? getVendorClosureLabel(outlet) : null);
    };

    syncVendorStatus();
    return subscribeToVendorStatus(syncVendorStatus);
  }, []);

  const trimmedMenu = useMemo(
    () =>
      menuItems
        .map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          isVeg: item.isVeg ?? true,
          canteenId: item.canteenId,
          isAvailable: item.isAvailable,
          image: item.image,
          description: item.description,
        })),
    [menuItems]
  );

  const orderContext = useMemo(() => {
    const orderCards = activeOrders.map((order) => ({
      orderId: order.id,
      outletName: order.outletName,
      pickupLocation: order.pickupLocation,
      pickupCode: order.pickupCode,
      status: order.status,
      estimatedTime: order.estimatedTime,
      delayMessage: getOrderDelayCopy(order),
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
      })),
    }));

    return {
      menu: trimmedMenu,
      userName: userSession?.userName ?? null,
      userRole: userSession?.authRole ?? null,
      cart: {
        itemCount: cartState.items.reduce((sum, item) => sum + item.quantity, 0),
        total: cartState.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        outletId: cartState.items[0]?.canteenId ?? null,
        items: cartState.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          canteenId: item.canteenId ?? null,
        })),
      },
      activeOrder: orderCards[0] ?? null,
      activeOrders: orderCards,
    };
  }, [activeOrders, cartState.items, trimmedMenu, userSession?.authRole, userSession?.userName]);

  const vendorContext = useMemo(() => {
    if (!vendorOutlet) return null;

    const statusInfo = getVendorOutletStatusInfo(vendorOutlet);
    const vendorMenu = menuItems.filter((item) => item.canteenId === getVendorOutletId(vendorOutlet));
    const activeVendorOrders = vendorOrders.filter((order) => order.status !== "collected");
    const completedVendorOrders = vendorOrders.filter((order) => order.status === "collected");
    const todayKey = getTodayKey();
    const todaysOrders = vendorOrders.filter((order) => order.businessDate === todayKey);
    const topItemMap = new Map<string, number>();

    for (const order of todaysOrders) {
      for (const item of order.items) {
        topItemMap.set(item.name, (topItemMap.get(item.name) ?? 0) + item.quantity);
      }
    }

    const topItems = Array.from(topItemMap.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    const toChatOrder = (order: (typeof vendorOrders)[number]) => ({
      orderId: order.id,
      customerName: order.customerName,
      status: order.status,
      estimatedTime: order.estimatedTime,
      pickupLocation: order.pickupLocation,
      delayState: order.delayState,
      delayMessage: order.delayMessage ?? null,
      prepMinutes: order.prepMinutes,
      basePrepMinutes: order.basePrepMinutes,
      vendorTimingUpdatedAt: order.vendorTimingUpdatedAt ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      total: order.total,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
      })),
    });

    const delayedOrders = activeVendorOrders.filter((order) => order.delayState === "delayed");
    const averagePrepMinutesToday = todaysOrders.length
      ? Math.round(todaysOrders.reduce((sum, order) => sum + order.prepMinutes, 0) / todaysOrders.length)
      : null;

    return {
      outletName: vendorOutlet,
      outletId: getVendorOutletId(vendorOutlet),
      location: getVendorLocation(vendorOutlet),
      isOutletOpen: statusInfo.isOpen,
      isTemporarilyClosed: statusInfo.isTemporarilyClosed,
      closedUntil: statusInfo.closedUntil,
      closureReason: statusInfo.closureReason,
      closureLabel: vendorClosureLabel,
      menu: vendorMenu,
      activeOrders: activeVendorOrders.map(toChatOrder),
      completedOrders: completedVendorOrders.slice(0, 15).map(toChatOrder),
      stats: {
        activeCount: activeVendorOrders.length,
        delayedCount: delayedOrders.length,
        readyCount: activeVendorOrders.filter((order) => order.status === "ready").length,
        acceptedCount: activeVendorOrders.filter((order) => order.status === "accepted").length,
        newCount: activeVendorOrders.filter((order) => order.status === "preparing").length,
        completedTodayCount: todaysOrders.filter((order) => order.status === "collected").length,
        averagePrepMinutesToday,
      },
      topItems,
    };
  }, [menuItems, vendorClosureLabel, vendorOrders, vendorOutlet]);

  const executeVendorAction = async (action: ChatAction) => {
    if (!vendorOutlet) {
      throw new Error("No vendor outlet is active right now.");
    }

    const outletId = getVendorOutletId(vendorOutlet);

    switch (action.type) {
      case "set_item_availability": {
        const itemIds = (action.payload.itemIds as string[]) ?? [];
        const isAvailable = Boolean(action.payload.isAvailable);
        setMenuItemsAvailability(outletId, itemIds, isAvailable);
        return `${itemIds.length} item${itemIds.length === 1 ? "" : "s"} ${isAvailable ? "marked available" : "marked unavailable"} for ${vendorOutlet}.`;
      }
      case "set_item_price": {
        const itemIds = (action.payload.itemIds as string[]) ?? [];
        const price = Number(action.payload.price);
        setMenuItemsPrice(outletId, itemIds, price);
        return `${itemIds.length} item${itemIds.length === 1 ? "" : "s"} updated to ${formatCurrency(price)}.`;
      }
      case "adjust_price_percent": {
        const itemIds = (action.payload.itemIds as string[]) ?? [];
        const percent = Number(action.payload.percent);
        adjustMenuItemsPriceByPercent(outletId, itemIds, percent);
        return `${itemIds.length} item${itemIds.length === 1 ? "" : "s"} updated by ${percent}% for ${vendorOutlet}.`;
      }
      case "create_menu_item": {
        const nextItem = createMenuItemForOutlet(outletId, {
          name: String(action.payload.name ?? ""),
          category: String(action.payload.category ?? ""),
          price: Number(action.payload.price ?? 0),
          description: action.payload.description ? String(action.payload.description) : "",
          isAvailable: action.payload.isAvailable === undefined ? true : Boolean(action.payload.isAvailable),
        });

        if (!nextItem) {
          throw new Error("I could not create that item because the draft details were incomplete.");
        }

        return `${nextItem.name} was added to ${vendorOutlet} at ${formatCurrency(nextItem.price)} in ${nextItem.category}.`;
      }
      case "temporary_close_outlet": {
        const durationMinutes = Number(action.payload.durationMinutes ?? 20);
        const reason = action.payload.reason ? String(action.payload.reason) : null;
        setVendorTemporaryClosure(durationMinutes, vendorOutlet, reason);
        return `${vendorOutlet} is now temporarily closed for ${durationMinutes} minutes.${reason ? ` Reason: ${reason}` : ""}`;
      }
      case "reopen_outlet": {
        clearVendorTemporaryClosure(vendorOutlet);
        return `${vendorOutlet} is now open again for checkout.`;
      }
      default:
        throw new Error("That vendor action is not supported yet.");
    }
  };

  const executeStudentAction = async (action: ChatAction) => {
    switch (action.type) {
      case "add_item_to_cart": {
        const itemId = String(action.payload.itemId ?? "");
        const quantity = Math.max(1, Number(action.payload.quantity ?? 1));
        const item = menuItems.find((entry) => entry.id === itemId);

        if (!item) {
          throw new Error("I could not find that menu item anymore.");
        }

        if (item.isAvailable === false) {
          throw new Error(`${item.name} is currently unavailable, so I couldn't add it to the cart.`);
        }

        const previousOutletId = cartState.items[0]?.canteenId ?? null;
        const hasExistingCart = Boolean(previousOutletId);
        const isDifferentCartOutlet =
          Boolean(previousOutletId) && Boolean(item.canteenId) && previousOutletId !== item.canteenId;

        if (isDifferentCartOutlet) {
          const currentOutletName = getOutletMetaById(previousOutletId ?? "").name;
          throw new Error(
            `I couldn't add ${item.name} because your cart already has items from ${currentOutletName}. ByteHive allows one outlet per cart at a time.`
          );
        }

        for (let index = 0; index < quantity; index += 1) {
          addItem({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            canteenId: item.canteenId,
          });
        }

        const quantityLabel = quantity === 1 ? "1 item" : `${quantity} items`;
        const outletName = item.canteenId ? getOutletMetaById(item.canteenId).name : "this outlet";

        return `${quantityLabel} added to your cart: ${item.name} from ${outletName}.${hasExistingCart ? " It matches your current cart outlet, so everything stays in one order." : ""}`;
      }
      default:
        throw new Error("That student chat action is not supported yet.");
    }
  };

  const isVendorRoute = location.pathname.startsWith("/vendor");
  const showVendorChat = isVendorRoute && Boolean(vendorOutlet) && location.pathname !== "/vendor/login";
  const showStudentChat = !isVendorRoute;

  return (
    <>
      <AppRoutes />
      {showStudentChat && <ChatWidget orderContext={orderContext} executeAction={executeStudentAction} />}
      {showVendorChat && <ChatWidget mode="vendor" orderContext={vendorContext ?? undefined} executeAction={executeVendorAction} />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
