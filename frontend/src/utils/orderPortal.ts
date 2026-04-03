import baseMenuData from "../data/menu.json";

export type UserRole = "student" | "faculty" | "guest";
export type OrderStatus = "preparing" | "accepted" | "ready" | "collected";

export interface ByteHiveOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface ByteHiveOrder {
  id: string;
  paymentId?: string;
  customerName: string;
  customerRole: UserRole;
  outletId: string;
  outletName: string;
  pickupLocation: string;
  estimatedTime: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: ByteHiveOrderItem[];
  subtotal: number;
  taxes: number;
  total: number;
}

export interface UserSession {
  authRole: UserRole;
  userName: string;
}

export interface AuthPromptDetail {
  reason: "add-to-cart" | "checkout" | "upgrade-guest";
  role?: "student" | "faculty";
}

export interface MenuCatalogItem {
  id: string;
  canteenId: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  isAvailable: boolean;
}

const ORDERS_KEY = "bytehiveOrders";
const USER_SESSION_KEY = "bytehiveUserSession";
const MENU_OVERRIDES_KEY = "bytehiveVendorMenuOverrides";
const ORDERS_EVENT = "bytehive-orders-updated";
const MENU_EVENT = "bytehive-menu-updated";
const USER_SESSION_EVENT = "bytehive-user-session-updated";
const AUTH_PROMPT_EVENT = "bytehive-auth-prompt";

const outletMetaById: Record<string, { name: string; location: string; estimatedTime: string }> = {
  punjabiBites: { name: "Punjabi Bites", location: "Block A, Basement", estimatedTime: "12-15 minutes" },
  rollsLane: { name: "Rolls Lane", location: "Block B, Food Court", estimatedTime: "10-14 minutes" },
  tasteOfDelhi: { name: "Taste of Delhi", location: "Block C, Ground Floor", estimatedTime: "14-18 minutes" },
  cafeCoffeeDay: { name: "Cafe Coffee Day", location: "Block D, Atrium", estimatedTime: "8-12 minutes" },
  AmritsarHaveli: { name: "Amritsari Haveli", location: "Block E, Ground Floor", estimatedTime: "14-18 minutes" },
  southSpice: { name: "Southern Delights", location: "Block G, South Wing", estimatedTime: "12-15 minutes" },
  bitesAndBrews: { name: "Bites & Brews", location: "Block H, Cafe Strip", estimatedTime: "10-12 minutes" },
  dominos: { name: "Domino's", location: "Block J, Campus Plaza", estimatedTime: "18-22 minutes" },
  gianis: { name: "Gianis", location: "Block F, Dessert Bay", estimatedTime: "8-10 minutes" },
};

const canteenIdByOutletName: Record<string, string> = Object.entries(outletMetaById).reduce<Record<string, string>>((acc, [id, meta]) => {
  acc[meta.name] = id;
  return acc;
}, {});

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`Unable to read ${key}:`, error);
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T, eventName: string) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(eventName));
  } catch (error) {
    console.error(`Unable to save ${key}:`, error);
  }
}

export function subscribeToKey(eventName: string, key: string, callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === key) callback();
  };

  window.addEventListener(eventName, callback as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(eventName, callback as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
}

function formatTimestamp(date = new Date()) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateOrderId() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  const random = Math.floor(Math.random() * 90 + 10);
  return `BH-${parts.join("")}-${random}`;
}

export function getOutletMetaById(outletId: string) {
  return outletMetaById[outletId] ?? {
    name: outletId,
    location: "Campus Food Court",
    estimatedTime: "10-15 minutes",
  };
}

export function getOutletIdByName(outletName: string) {
  return canteenIdByOutletName[outletName] ?? outletName;
}

export function getCurrentUserSession(): UserSession | null {
  return readJSON<UserSession | null>(USER_SESSION_KEY, null);
}

export function setCurrentUserSession(session: UserSession | null) {
  if (typeof window === "undefined") return;

  try {
    if (session) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent(USER_SESSION_EVENT));
  } catch (error) {
    console.error("Unable to save user session:", error);
  }
}

export function subscribeToUserSession(callback: () => void) {
  return subscribeToKey(USER_SESSION_EVENT, USER_SESSION_KEY, callback);
}

export function requestAuthPrompt(detail: AuthPromptDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AuthPromptDetail>(AUTH_PROMPT_EVENT, { detail }));
}

export function subscribeToAuthPrompt(callback: (detail: AuthPromptDetail) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    callback((event as CustomEvent<AuthPromptDetail>).detail);
  };

  window.addEventListener(AUTH_PROMPT_EVENT, handler as EventListener);
  return () => window.removeEventListener(AUTH_PROMPT_EVENT, handler as EventListener);
}

export function getOrders() {
  return readJSON<ByteHiveOrder[]>(ORDERS_KEY, []);
}

export function getOrderById(orderId: string) {
  return getOrders().find((order) => order.id === orderId) ?? null;
}

export function getOrdersForOutlet(outletName: string) {
  return getOrders().filter((order) => order.outletName === outletName);
}

export function getOrdersForUser(userName: string) {
  return getOrders().filter((order) => order.customerName === userName);
}

export function getActiveOrdersForUser(userName: string) {
  return getOrdersForUser(userName)
    .filter((order) => order.status !== "collected")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCompletedOrdersForUser(userName: string) {
  return getOrdersForUser(userName)
    .filter((order) => order.status === "collected")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createOrder(payload: {
  paymentId?: string;
  outletId: string;
  customerName: string;
  customerRole: UserRole;
  items: ByteHiveOrderItem[];
}) {
  const meta = getOutletMetaById(payload.outletId);
  const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes;
  const now = new Date().toISOString();

  const order: ByteHiveOrder = {
    id: generateOrderId(),
    paymentId: payload.paymentId,
    customerName: payload.customerName,
    customerRole: payload.customerRole,
    outletId: payload.outletId,
    outletName: meta.name,
    pickupLocation: meta.location,
    estimatedTime: meta.estimatedTime,
    status: "preparing",
    createdAt: now,
    updatedAt: now,
    items: payload.items,
    subtotal,
    taxes,
    total,
  };

  const nextOrders = [order, ...getOrders()];
  writeJSON(ORDERS_KEY, nextOrders, ORDERS_EVENT);
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const nextOrders = getOrders().map((order) =>
    order.id === orderId
      ? {
          ...order,
          status,
          updatedAt: new Date().toISOString(),
        }
      : order
  );

  writeJSON(ORDERS_KEY, nextOrders, ORDERS_EVENT);
  return nextOrders.find((order) => order.id === orderId) ?? null;
}

export function subscribeToOrders(callback: () => void) {
  return subscribeToKey(ORDERS_EVENT, ORDERS_KEY, callback);
}

export function getQrValueForOrder(orderId: string) {
  return `ByteHive-Order-${orderId}`;
}

export function validateQrPayload(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (/^BH-/i.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^ByteHive-Order-(.+)$/i);
  if (!match) return null;
  return match[1];
}

function getStoredMenuOverrides() {
  return readJSON<Record<string, MenuCatalogItem[]>>(MENU_OVERRIDES_KEY, {});
}

export function getMenuItemsForOutlet(outletId: string) {
  const overrides = getStoredMenuOverrides();
  if (overrides[outletId]?.length) return overrides[outletId];

  return (baseMenuData as MenuCatalogItem[])
    .filter((item) => item.canteenId === outletId)
    .map((item) => ({ ...item, description: item.description ?? "Freshly prepared at ByteHive." }));
}

export function saveMenuItemsForOutlet(outletId: string, items: MenuCatalogItem[]) {
  const next = {
    ...getStoredMenuOverrides(),
    [outletId]: items,
  };

  writeJSON(MENU_OVERRIDES_KEY, next, MENU_EVENT);
}

export function subscribeToMenu(callback: () => void) {
  return subscribeToKey(MENU_EVENT, MENU_OVERRIDES_KEY, callback);
}

export function getOrdersSummaryTimestamp(isoDate: string) {
  return formatTimestamp(new Date(isoDate));
}
