import baseMenuData from "../data/menu.json";

export type UserRole = "student" | "faculty" | "guest";
export type OrderStatus = "preparing" | "accepted" | "ready" | "handoff" | "collected";

export interface ByteHiveOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface ByteHiveOrder {
  id: string;
  receiptNumber: string;
  sequenceNumber: number;
  businessDate: string;
  pickupCode: string;
  paymentId?: string;
  customerName: string;
  customerRole: UserRole;
  outletId: string;
  outletName: string;
  pickupLocation: string;
  estimatedTime: string;
  status: OrderStatus;
  qrToken: string;
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

export interface ParsedQrPayload {
  orderId: string;
  outletId?: string;
  qrToken?: string;
}

const ORDERS_KEY = "bytehiveOrders";
const USER_SESSION_KEY = "bytehiveUserSession";
const MENU_OVERRIDES_KEY = "bytehiveVendorMenuOverrides";
const ORDER_COUNTERS_KEY = "bytehiveOrderCounters";
const ORDERS_EVENT = "bytehive-orders-updated";
const MENU_EVENT = "bytehive-menu-updated";
const USER_SESSION_EVENT = "bytehive-user-session-updated";
const AUTH_PROMPT_EVENT = "bytehive-auth-prompt";

const outletMetaById: Record<string, { name: string; location: string; estimatedTime: string; code: string }> = {
  punjabiBites: { name: "Punjabi Bites", location: "Block A, Basement", estimatedTime: "12-15 minutes", code: "PB" },
  rollsLane: { name: "Rolls Lane", location: "Block B, Food Court", estimatedTime: "10-14 minutes", code: "RL" },
  tasteOfDelhi: { name: "Taste of Delhi", location: "Block C, Ground Floor", estimatedTime: "14-18 minutes", code: "TD" },
  cafeCoffeeDay: { name: "Cafe Coffee Day", location: "Block D, Atrium", estimatedTime: "8-12 minutes", code: "CCD" },
  AmritsarHaveli: { name: "Amritsari Haveli", location: "Block E, Ground Floor", estimatedTime: "14-18 minutes", code: "AH" },
  southSpice: { name: "Southern Delights", location: "Block G, South Wing", estimatedTime: "12-15 minutes", code: "SD" },
  bitesAndBrews: { name: "Bites & Brews", location: "Block H, Cafe Strip", estimatedTime: "10-12 minutes", code: "BB" },
  dominos: { name: "Domino's", location: "Block J, Campus Plaza", estimatedTime: "18-22 minutes", code: "DM" },
  gianis: { name: "Gianis", location: "Block F, Dessert Bay", estimatedTime: "8-10 minutes", code: "GN" },
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

function getBusinessDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

function getRandomToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  }

  return Math.random().toString(36).slice(2, 14).toUpperCase();
}

function getDailySequence(outletId: string, businessDate: string) {
  const counters = readJSON<Record<string, number>>(ORDER_COUNTERS_KEY, {});
  const counterKey = `${outletId}:${businessDate}`;
  const nextValue = (counters[counterKey] ?? 0) + 1;

  if (typeof window !== "undefined") {
    localStorage.setItem(
      ORDER_COUNTERS_KEY,
      JSON.stringify({
        ...counters,
        [counterKey]: nextValue,
      })
    );
  }

  return nextValue;
}

function createReceiptNumber(outletId: string, businessDate: string, sequenceNumber: number) {
  const outletCode = outletMetaById[outletId]?.code ?? outletId.slice(0, 3).toUpperCase();
  return `${outletCode}-${businessDate}-${String(sequenceNumber).padStart(3, "0")}`;
}

function createPickupCode(sequenceNumber: number) {
  return String(sequenceNumber).padStart(4, "0");
}

function normalizeStoredOrder(order: ByteHiveOrder): ByteHiveOrder {
  const businessDate = order.businessDate ?? getBusinessDate(new Date(order.createdAt));
  const sequenceNumber =
    typeof order.sequenceNumber === "number" && order.sequenceNumber > 0
      ? order.sequenceNumber
      : Number(order.id.match(/-(\d{2,4})$/)?.[1] ?? 1);
  const receiptNumber = order.receiptNumber ?? order.id;

  return {
    ...order,
    id: receiptNumber,
    receiptNumber,
    sequenceNumber,
    businessDate,
    pickupCode: order.pickupCode ?? createPickupCode(sequenceNumber),
    qrToken: order.qrToken ?? `LEGACY-${receiptNumber.replace(/[^A-Za-z0-9]/g, "").slice(-8)}`,
  };
}

function resolveOrder(orderOrId: ByteHiveOrder | string) {
  if (typeof orderOrId === "string") {
    return getOrderById(orderOrId);
  }
  return normalizeStoredOrder(orderOrId);
}

export function getOutletMetaById(outletId: string) {
  return outletMetaById[outletId] ?? {
    name: outletId,
    location: "Campus Food Court",
    estimatedTime: "10-15 minutes",
    code: outletId.slice(0, 3).toUpperCase(),
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
  return readJSON<ByteHiveOrder[]>(ORDERS_KEY, []).map(normalizeStoredOrder);
}

export function getOrderById(orderId: string) {
  return getOrders().find((order) => order.id === orderId || order.receiptNumber === orderId) ?? null;
}

export function getOrdersForOutlet(outletName: string) {
  return getOrders().filter((order) => order.outletName === outletName);
}

export function getOrderForOutletByPickupCode(outletName: string, pickupCode: string) {
  const normalized = pickupCode.trim();
  if (!normalized) return null;

  return getOrdersForOutlet(outletName).find((order) => order.pickupCode === normalized) ?? null;
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
  const createdAt = new Date();
  const businessDate = getBusinessDate(createdAt);
  const sequenceNumber = getDailySequence(payload.outletId, businessDate);
  const receiptNumber = createReceiptNumber(payload.outletId, businessDate, sequenceNumber);
  const now = createdAt.toISOString();

  const order: ByteHiveOrder = {
    id: receiptNumber,
    receiptNumber,
    sequenceNumber,
    businessDate,
    pickupCode: createPickupCode(sequenceNumber),
    paymentId: payload.paymentId,
    customerName: payload.customerName,
    customerRole: payload.customerRole,
    outletId: payload.outletId,
    outletName: meta.name,
    pickupLocation: meta.location,
    estimatedTime: meta.estimatedTime,
    status: "preparing",
    qrToken: getRandomToken(),
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

export function getQrValueForOrder(orderOrId: ByteHiveOrder | string) {
  const order = resolveOrder(orderOrId);
  if (!order) {
    return typeof orderOrId === "string" ? `ByteHive-Order-${orderOrId}` : "";
  }

  return `ByteHive|${order.outletId}|${order.receiptNumber}|${order.qrToken}`;
}

export function validateQrPayload(rawValue: string): ParsedQrPayload | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (/^ByteHive\|/i.test(trimmed)) {
    const [, outletId, orderId, qrToken] = trimmed.split("|");
    if (!outletId || !orderId || !qrToken) return null;
    return { outletId, orderId, qrToken };
  }

  if (/^BH-/i.test(trimmed) || /^[A-Z]{2,4}-\d{8}-\d{3,4}$/i.test(trimmed)) {
    return { orderId: trimmed };
  }

  const legacyMatch = trimmed.match(/^ByteHive-Order-(.+)$/i);
  if (!legacyMatch) return null;
  return { orderId: legacyMatch[1] };
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
