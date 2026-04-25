import baseMenuData from "@/features/menu/data/menu.json";

export type UserRole = "student" | "faculty" | "guest";
export type OrderStatus = "scheduled" | "preparing" | "accepted" | "ready" | "handoff" | "collected";
export type OrderDelayState = "on-time" | "delayed";
export type OrderFulfillmentType = "instant" | "scheduled";

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
  fulfillmentType: OrderFulfillmentType;
  scheduledFor?: string | null;
  vendorNotes?: string | null;
  outletId: string;
  outletName: string;
  pickupLocation: string;
  basePrepMinutes: number;
  prepMinutes: number;
  estimatedTime: string;
  delayState: OrderDelayState;
  delayMessage?: string | null;
  vendorTimingUpdatedAt?: string | null;
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
  isVeg?: boolean;
  description?: string;
  image?: string;
  isAvailable: boolean;
  labels?: string[];
}

export interface MenuItemDraftInput {
  name: string;
  category: string;
  price: number;
  description?: string;
  isAvailable?: boolean;
  isVeg?: boolean;
  image?: string;
}

export interface FavoriteMenuItem {
  id: string;
  canteenId: string;
  outletName: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  description?: string;
  isVeg?: boolean;
  isAvailable: boolean;
  savedAt: string;
}

export interface ParsedQrPayload {
  orderId: string;
  outletId?: string;
  qrToken?: string;
}

const ORDERS_KEY = "bytehiveOrders";
const USER_SESSION_KEY = "bytehiveUserSession";
const MENU_OVERRIDES_KEY = "bytehiveVendorMenuOverrides";
const FAVORITES_KEY = "bytehiveFavoriteItems";
const ORDER_COUNTERS_KEY = "bytehiveOrderCounters";
const ORDERS_EVENT = "bytehive-orders-updated";
const MENU_EVENT = "bytehive-menu-updated";
const FAVORITES_EVENT = "bytehive-favorites-updated";
const USER_SESSION_EVENT = "bytehive-user-session-updated";
const AUTH_PROMPT_EVENT = "bytehive-auth-prompt";
const ORDERS_API_PATH = "/api/orders";
const ORDERS_SYNC_INTERVAL_MS = 2500;

let ordersSyncTimer: number | null = null;
let ordersSyncSubscriberCount = 0;
let ordersSyncInFlight: Promise<void> | null = null;

const outletMetaById: Record<string, { name: string; location: string; estimatedTime: string; code: string }> = {
  punjabiBites: { name: "Punjabi Bites", location: "Block A, Basement", estimatedTime: "12-15 minutes", code: "PB" },
  rollsLane: { name: "Rolls Lane", location: "Block B, Food Court", estimatedTime: "10-14 minutes", code: "RL" },
  tasteOfDelhi: { name: "Taste of Delhi", location: "Block C, Ground Floor", estimatedTime: "14-18 minutes", code: "TD" },
  cafeCoffeeDay: { name: "Cafe Coffee Day", location: "Block D, Atrium", estimatedTime: "8-12 minutes", code: "CCD" },
  AmritsarHaveli: { name: "Amritsari Haveli", location: "Block E, Ground Floor", estimatedTime: "14-18 minutes", code: "AH" },
  southernDelight: { name: "Southern Delights", location: "Block G, South Wing", estimatedTime: "12-15 minutes", code: "SD" },
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

function parseEstimatedMinutes(label?: string) {
  if (!label) return 15;

  const matches = Array.from(label.matchAll(/\d+/g)).map((match) => Number.parseInt(match[0], 10));
  if (matches.length === 0) return 15;
  return Math.max(...matches);
}

function formatPrepMinutes(minutes: number) {
  const normalized = Math.max(0, Math.round(minutes));
  return normalized === 1 ? "1 minute" : `${normalized} minutes`;
}

export function formatScheduledOrderLabel(isoDate?: string | null) {
  if (!isoDate) return "Scheduled order";

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Scheduled order";

  return `Today, ${date.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getTimingAnchor(order: Pick<ByteHiveOrder, "vendorTimingUpdatedAt" | "createdAt">) {
  return order.vendorTimingUpdatedAt ?? order.createdAt;
}

export function getOrderRemainingMs(order: Pick<ByteHiveOrder, "status" | "delayState" | "prepMinutes" | "vendorTimingUpdatedAt" | "createdAt">, now = Date.now()) {
  if (order.status === "scheduled") {
    const scheduledFor = (order as ByteHiveOrder).scheduledFor;
    return scheduledFor ? Math.max(0, new Date(scheduledFor).getTime() - now) : 0;
  }

  if (order.status === "ready" || order.status === "handoff" || order.status === "collected") {
    return 0;
  }

  if (order.delayState === "delayed") {
    return Math.max(0, Math.round(order.prepMinutes) * 60_000);
  }

  const anchorTime = new Date(getTimingAnchor(order)).getTime();
  const targetTime = anchorTime + Math.max(0, Math.round(order.prepMinutes)) * 60_000;
  return Math.max(0, targetTime - now);
}

export function getLivePrepMinutes(order: Pick<ByteHiveOrder, "status" | "delayState" | "prepMinutes" | "vendorTimingUpdatedAt" | "createdAt">, now = Date.now()) {
  return Math.ceil(getOrderRemainingMs(order, now) / 60_000);
}

export function formatCountdownClock(totalMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getOrderCountdownState(order: ByteHiveOrder, now = Date.now()) {
  const remainingMs = getOrderRemainingMs(order, now);
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  const isDelayed = order.delayState === "delayed";
  const isActive = order.status === "preparing" || order.status === "accepted";
  const isStopped = isDelayed || !isActive;

  return {
    remainingMs,
    remainingMinutes,
    clockLabel: formatCountdownClock(remainingMs),
    timerLabel: remainingMs > 0 ? formatPrepMinutes(remainingMinutes) : "Less than 1 minute",
    isDelayed,
    isStopped,
    isActive,
  };
}

function deriveEstimatedTime(order: {
  status: OrderStatus;
  prepMinutes: number;
  delayState: OrderDelayState;
  fulfillmentType?: OrderFulfillmentType;
  scheduledFor?: string | null;
}) {
  if (order.status === "scheduled") {
    return formatScheduledOrderLabel(order.scheduledFor);
  }
  if (order.status === "ready") return "Ready for pickup";
  if (order.status === "handoff") return "Counter verification in progress";
  if (order.status === "collected") return "Collected";

  const timing = `About ${formatPrepMinutes(order.prepMinutes)}`;
  return order.delayState === "delayed" ? `Delayed | ${timing}` : timing;
}

function normalizeStoredOrder(order: ByteHiveOrder): ByteHiveOrder {
  const storedOrder = order as ByteHiveOrder & Partial<Pick<ByteHiveOrder, "basePrepMinutes" | "prepMinutes" | "delayState" | "delayMessage" | "vendorTimingUpdatedAt" | "fulfillmentType" | "scheduledFor" | "vendorNotes">>;
  const businessDate = storedOrder.businessDate ?? getBusinessDate(new Date(storedOrder.createdAt));
  const sequenceNumber =
    typeof storedOrder.sequenceNumber === "number" && storedOrder.sequenceNumber > 0
      ? storedOrder.sequenceNumber
      : Number(storedOrder.id.match(/-(\d{2,4})$/)?.[1] ?? 1);
  const receiptNumber = storedOrder.receiptNumber ?? storedOrder.id;
  const basePrepMinutes =
    typeof storedOrder.basePrepMinutes === "number" && storedOrder.basePrepMinutes > 0
      ? storedOrder.basePrepMinutes
      : parseEstimatedMinutes(storedOrder.estimatedTime);
  const prepMinutes =
    typeof storedOrder.prepMinutes === "number" && storedOrder.prepMinutes >= 0
      ? storedOrder.prepMinutes
      : basePrepMinutes;
  const delayState = storedOrder.delayState === "delayed" ? "delayed" : "on-time";
  const fulfillmentType = storedOrder.fulfillmentType === "scheduled" ? "scheduled" : "instant";

  return {
    ...storedOrder,
    id: receiptNumber,
    receiptNumber,
    sequenceNumber,
    businessDate,
    fulfillmentType,
    scheduledFor: storedOrder.scheduledFor ?? null,
    vendorNotes: storedOrder.vendorNotes ?? null,
    pickupCode: storedOrder.pickupCode ?? createPickupCode(sequenceNumber),
    qrToken: storedOrder.qrToken ?? `LEGACY-${receiptNumber.replace(/[^A-Za-z0-9]/g, "").slice(-8)}`,
    basePrepMinutes,
    prepMinutes,
    delayState,
    delayMessage: storedOrder.delayMessage ?? null,
    vendorTimingUpdatedAt: storedOrder.vendorTimingUpdatedAt ?? null,
    estimatedTime: deriveEstimatedTime({
      status: storedOrder.status,
      prepMinutes,
      delayState,
      fulfillmentType,
      scheduledFor: storedOrder.scheduledFor ?? null,
    }),
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

function saveOrders(orders: ByteHiveOrder[]) {
  writeJSON(ORDERS_KEY, orders, ORDERS_EVENT);
}

function replaceOrdersSnapshot(orders: ByteHiveOrder[]) {
  const normalized = orders.map(normalizeStoredOrder);
  const current = getOrders();

  if (JSON.stringify(current) === JSON.stringify(normalized)) {
    return normalized;
  }

  saveOrders(normalized);
  return normalized;
}

async function fetchOrdersSnapshot() {
  const response = await fetch(ORDERS_API_PATH, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ByteHiveOrder[];
}

async function pushOrdersSnapshot(orders: ByteHiveOrder[]) {
  const response = await fetch(ORDERS_API_PATH, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orders }),
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ByteHiveOrder[];
}

let lastSyncTimestamp = 0;
const MIN_SYNC_INTERVAL_MS = 1500;

export async function syncOrdersFromServer(force = false) {
  if (typeof window === "undefined") return getOrders();

  const now = Date.now();
  if (!force && (ordersSyncInFlight || now - lastSyncTimestamp < MIN_SYNC_INTERVAL_MS)) {
    if (ordersSyncInFlight) await ordersSyncInFlight;
    return getOrders();
  }
  lastSyncTimestamp = now;

  ordersSyncInFlight = (async () => {
    try {
      const localOrders = getOrders();
      let snapshot = await fetchOrdersSnapshot();

      if (!snapshot) {
        return;
      }

      if (snapshot.length === 0 && localOrders.length > 0) {
        snapshot = await pushOrdersSnapshot(localOrders);
        if (!snapshot) return;
      }

      replaceOrdersSnapshot(snapshot);
    } catch (error) {
      console.error("Unable to sync orders from server:", error);
    }
  })();

  await ordersSyncInFlight;
  ordersSyncInFlight = null;
  return getOrders();
}

export function getOrderById(orderId: string) {
  return getOrders().find((order) => order.id === orderId || order.receiptNumber === orderId) ?? null;
}

export function getAllOrders() {
  return getOrders();
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

export async function createOrder(payload: {
  paymentId?: string;
  outletId: string;
  customerName: string;
  customerRole: UserRole;
  items: ByteHiveOrderItem[];
  fulfillmentType?: OrderFulfillmentType;
  scheduledFor?: string | null;
  vendorNotes?: string | null;
}) {
  const response = await fetch(ORDERS_API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create order.");
  }

  const order = normalizeStoredOrder((await response.json()) as ByteHiveOrder);
  replaceOrdersSnapshot([order, ...getOrders().filter((existing) => existing.id !== order.id)]);
  void syncOrdersFromServer(true);
  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const response = await fetch(`${ORDERS_API_PATH}/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error("Unable to update order status.");
  }

  const updatedOrder = normalizeStoredOrder((await response.json()) as ByteHiveOrder);
  replaceOrdersSnapshot(getOrders().map((order) => (order.id === orderId ? updatedOrder : order)));
  void syncOrdersFromServer(true);
  return updatedOrder;
}

export async function updateOrderTiming(
  orderId: string,
  payload: {
    prepMinutes?: number;
    delayState?: OrderDelayState;
    delayMessage?: string | null;
    resetToBase?: boolean;
  }
) {
  const response = await fetch(`${ORDERS_API_PATH}/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to update order timing.");
  }

  const updatedOrder = normalizeStoredOrder((await response.json()) as ByteHiveOrder);
  replaceOrdersSnapshot(getOrders().map((order) => (order.id === orderId ? updatedOrder : order)));
  void syncOrdersFromServer(true);
  return updatedOrder;
}

export function subscribeToOrders(callback: () => void) {
  const unsubscribe = subscribeToKey(ORDERS_EVENT, ORDERS_KEY, callback);

  if (typeof window !== "undefined") {
    ordersSyncSubscriberCount += 1;
    if (ordersSyncTimer === null) {
      ordersSyncTimer = window.setInterval(() => {
        void syncOrdersFromServer();
      }, ORDERS_SYNC_INTERVAL_MS);
    }
  }

  return () => {
    unsubscribe();

    if (typeof window !== "undefined") {
      ordersSyncSubscriberCount = Math.max(0, ordersSyncSubscriberCount - 1);
      if (ordersSyncSubscriberCount === 0 && ordersSyncTimer !== null) {
        window.clearInterval(ordersSyncTimer);
        ordersSyncTimer = null;
      }
    }
  };
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

function getStoredFavorites() {
  return readJSON<Record<string, FavoriteMenuItem[]>>(FAVORITES_KEY, {});
}

export function getMenuItemsForOutlet(outletId: string) {
  const overrides = getStoredMenuOverrides();
  if (overrides[outletId]?.length) return overrides[outletId];

  return (baseMenuData as MenuCatalogItem[])
    .filter((item) => item.canteenId === outletId)
    .map((item) => ({ ...item, description: item.description ?? "Freshly prepared at ByteHive." }));
}

export function getAllMenuItems() {
  const overrides = getStoredMenuOverrides();
  const outletIds = new Set<string>([
    ...(baseMenuData as MenuCatalogItem[]).map((item) => item.canteenId),
    ...Object.keys(overrides),
  ]);

  return Array.from(outletIds).flatMap((outletId) => getMenuItemsForOutlet(outletId));
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

export function updateMenuItemsForOutlet(outletId: string, updater: (items: MenuCatalogItem[]) => MenuCatalogItem[]) {
  const currentItems = getMenuItemsForOutlet(outletId);
  const nextItems = updater(currentItems);
  saveMenuItemsForOutlet(outletId, nextItems);
  return nextItems;
}

export function setMenuItemsAvailability(outletId: string, itemIds: string[], isAvailable: boolean) {
  const idSet = new Set(itemIds);
  return updateMenuItemsForOutlet(outletId, (items) =>
    items.map((item) => (idSet.has(item.id) ? { ...item, isAvailable } : item))
  );
}

export function setMenuItemsPrice(outletId: string, itemIds: string[], price: number) {
  const nextPrice = Math.max(0, Math.round(price * 100) / 100);
  const idSet = new Set(itemIds);
  return updateMenuItemsForOutlet(outletId, (items) =>
    items.map((item) => (idSet.has(item.id) ? { ...item, price: nextPrice } : item))
  );
}

export function adjustMenuItemsPriceByPercent(outletId: string, itemIds: string[], percent: number) {
  const multiplier = 1 + percent / 100;
  const idSet = new Set(itemIds);
  return updateMenuItemsForOutlet(outletId, (items) =>
    items.map((item) =>
      idSet.has(item.id)
        ? {
            ...item,
            price: Math.max(0, Math.round(item.price * multiplier * 100) / 100),
          }
        : item
    )
  );
}

export function createMenuItemForOutlet(outletId: string, item: MenuItemDraftInput) {
  const normalizedName = item.name.trim();
  const normalizedCategory = item.category.trim();
  const price = Math.max(0, Math.round(item.price * 100) / 100);

  if (!normalizedName || !normalizedCategory) {
    return null;
  }

  const nextItem: MenuCatalogItem = {
    id: `${outletId}-${Date.now()}`,
    canteenId: outletId,
    name: normalizedName,
    category: normalizedCategory,
    price,
    description: item.description?.trim() || "Freshly prepared at ByteHive.",
    image: item.image,
    isAvailable: item.isAvailable ?? true,
    isVeg: item.isVeg ?? true,
  };

  updateMenuItemsForOutlet(outletId, (items) => [nextItem, ...items]);
  return nextItem;
}

export function getFavoriteItemsForUser(userName: string) {
  if (!userName.trim()) return [];
  return (getStoredFavorites()[userName] ?? []).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function isFavoriteItemForUser(userName: string, itemId: string) {
  if (!userName.trim() || !itemId.trim()) return false;
  return getFavoriteItemsForUser(userName).some((item) => item.id === itemId);
}

export function saveFavoriteItemForUser(
  userName: string,
  item: Omit<FavoriteMenuItem, "savedAt" | "outletName"> & { outletName?: string }
) {
  if (!userName.trim()) return null;

  const favorites = getStoredFavorites();
  const currentItems = favorites[userName] ?? [];
  const favoriteItem: FavoriteMenuItem = {
    ...item,
    outletName: item.outletName ?? getOutletMetaById(item.canteenId).name,
    savedAt: new Date().toISOString(),
  };
  const nextItems = [favoriteItem, ...currentItems.filter((entry) => entry.id !== item.id)];

  writeJSON(
    FAVORITES_KEY,
    {
      ...favorites,
      [userName]: nextItems,
    },
    FAVORITES_EVENT
  );

  return favoriteItem;
}

export function removeFavoriteItemForUser(userName: string, itemId: string) {
  if (!userName.trim() || !itemId.trim()) return;

  const favorites = getStoredFavorites();
  const currentItems = favorites[userName] ?? [];
  const nextItems = currentItems.filter((item) => item.id !== itemId);

  writeJSON(
    FAVORITES_KEY,
    {
      ...favorites,
      [userName]: nextItems,
    },
    FAVORITES_EVENT
  );
}

export function toggleFavoriteItemForUser(
  userName: string,
  item: Omit<FavoriteMenuItem, "savedAt" | "outletName"> & { outletName?: string }
) {
  if (isFavoriteItemForUser(userName, item.id)) {
    removeFavoriteItemForUser(userName, item.id);
    return false;
  }

  saveFavoriteItemForUser(userName, item);
  return true;
}

export function subscribeToFavorites(callback: () => void) {
  return subscribeToKey(FAVORITES_EVENT, FAVORITES_KEY, callback);
}

export function getOrdersSummaryTimestamp(isoDate: string) {
  return formatTimestamp(new Date(isoDate));
}

export function getRelativeTimeLabel(isoDate?: string | null, now = Date.now()) {
  if (!isoDate) return null;

  const diffMs = Math.max(0, now - new Date(isoDate).getTime());
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return `${diffSeconds} sec ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return diffMinutes === 1 ? "1 min ago" : `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return diffHours === 1 ? "1 hr ago" : `${diffHours} hrs ago`;

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
}

export function getOrderEtaLabel(order: ByteHiveOrder) {
  if (order.status === "scheduled") {
    return formatScheduledOrderLabel(order.scheduledFor);
  }
  return order.estimatedTime;
}

export function getOrderDelayCopy(order: ByteHiveOrder) {
  if (order.delayState !== "delayed") return null;
  return order.delayMessage ?? "Sorry, your order will be late.";
}
