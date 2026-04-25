import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  formatScheduledOrderLabel,
  getLivePrepMinutes,
  getOutletMetaById,
  type ByteHiveOrder,
  type ByteHiveOrderItem,
  type OrderDelayState,
  type OrderFulfillmentType,
  type OrderStatus,
  type UserRole,
} from "@/features/orders/services/order-portal.service";

type OrderCounters = Record<string, number>;

type CreateOrderPayload = {
  paymentId?: string;
  outletId: string;
  customerName: string;
  customerRole: UserRole;
  items: ByteHiveOrderItem[];
  fulfillmentType?: OrderFulfillmentType;
  scheduledFor?: string | null;
  vendorNotes?: string | null;
};

type UpdateTimingPayload = {
  prepMinutes?: number;
  delayState?: OrderDelayState;
  delayMessage?: string | null;
  resetToBase?: boolean;
};

const DATA_DIR = path.join(process.cwd(), "data", "runtime");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const COUNTERS_FILE = path.join(DATA_DIR, "order-counters.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  await ensureDataDir();

  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, value: T) {
  await ensureDataDir();
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
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

function createPickupCode(sequenceNumber: number) {
  return String(sequenceNumber).padStart(4, "0");
}

function createReceiptNumber(outletId: string, businessDate: string, sequenceNumber: number) {
  const outletMeta = getOutletMetaById(outletId);
  const outletCode = outletMeta.code ?? outletId.slice(0, 3).toUpperCase();
  return `${outletCode}-${businessDate}-${String(sequenceNumber).padStart(3, "0")}`;
}

async function getNextSequenceNumber(outletId: string, businessDate: string) {
  const counters = await readJsonFile<OrderCounters>(COUNTERS_FILE, {});
  const counterKey = `${outletId}:${businessDate}`;
  const nextValue = (counters[counterKey] ?? 0) + 1;
  await writeJsonFile(COUNTERS_FILE, {
    ...counters,
    [counterKey]: nextValue,
  });
  return nextValue;
}

export async function getStoredOrders() {
  const orders = await readJsonFile<ByteHiveOrder[]>(ORDERS_FILE, []);
  return orders.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getStoredOrderById(orderId: string) {
  const orders = await getStoredOrders();
  return orders.find((order) => order.id === orderId || order.receiptNumber === orderId) ?? null;
}

export async function replaceStoredOrders(orders: ByteHiveOrder[]) {
  const normalized = [...orders].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const rebuiltCounters = normalized.reduce<OrderCounters>((acc, order) => {
    const counterKey = `${order.outletId}:${order.businessDate}`;
    acc[counterKey] = Math.max(acc[counterKey] ?? 0, order.sequenceNumber);
    return acc;
  }, {});

  await writeJsonFile(ORDERS_FILE, normalized);
  await writeJsonFile(COUNTERS_FILE, rebuiltCounters);
  return normalized;
}

export async function createStoredOrder(payload: CreateOrderPayload) {
  const outletMeta = getOutletMetaById(payload.outletId);
  const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes;
  const createdAt = new Date();
  const businessDate = getBusinessDate(createdAt);
  const sequenceNumber = await getNextSequenceNumber(payload.outletId, businessDate);
  const receiptNumber = createReceiptNumber(payload.outletId, businessDate, sequenceNumber);
  const now = createdAt.toISOString();
  const basePrepMinutes = parseEstimatedMinutes(outletMeta.estimatedTime);
  const fulfillmentType = payload.fulfillmentType === "scheduled" ? "scheduled" : "instant";
  const initialStatus: OrderStatus = fulfillmentType === "scheduled" ? "scheduled" : "preparing";

  const order: ByteHiveOrder = {
    id: receiptNumber,
    receiptNumber,
    sequenceNumber,
    businessDate,
    pickupCode: createPickupCode(sequenceNumber),
    paymentId: payload.paymentId,
    customerName: payload.customerName,
    customerRole: payload.customerRole,
    fulfillmentType,
    scheduledFor: payload.scheduledFor ?? null,
    vendorNotes: payload.vendorNotes?.trim() || null,
    outletId: payload.outletId,
    outletName: outletMeta.name,
    pickupLocation: outletMeta.location,
    basePrepMinutes,
    prepMinutes: basePrepMinutes,
    estimatedTime: deriveEstimatedTime({
      status: initialStatus,
      prepMinutes: basePrepMinutes,
      delayState: "on-time",
      fulfillmentType,
      scheduledFor: payload.scheduledFor ?? null,
    }),
    delayState: "on-time",
    delayMessage: null,
    vendorTimingUpdatedAt: null,
    status: initialStatus,
    qrToken: getRandomToken(),
    createdAt: now,
    updatedAt: now,
    items: payload.items,
    subtotal,
    taxes,
    total,
  };

  const orders = await getStoredOrders();
  await writeJsonFile(ORDERS_FILE, [order, ...orders]);
  return order;
}

export async function updateStoredOrderStatus(orderId: string, status: OrderStatus) {
  const orders = await getStoredOrders();
  let updatedOrder: ByteHiveOrder | null = null;

  const nextOrders = orders.map((order) => {
    if (order.id !== orderId) return order;

    const nextPrepMinutes = status === "ready" || status === "handoff" || status === "collected" ? 0 : order.prepMinutes;
    const nextDelayState = status === "ready" || status === "handoff" || status === "collected" ? "on-time" : order.delayState;
    const statusChangedAt = new Date().toISOString();
    const shouldResetTimerAnchor = order.status === "scheduled" && (status === "accepted" || status === "preparing");

    updatedOrder = {
      ...order,
      prepMinutes: nextPrepMinutes,
      delayState: nextDelayState,
      delayMessage: status === "ready" || status === "handoff" || status === "collected" ? null : order.delayMessage,
      vendorTimingUpdatedAt: shouldResetTimerAnchor ? statusChangedAt : order.vendorTimingUpdatedAt,
      status,
      estimatedTime: deriveEstimatedTime({
        status,
        prepMinutes: nextPrepMinutes,
        delayState: nextDelayState,
        fulfillmentType: order.fulfillmentType,
        scheduledFor: order.scheduledFor ?? null,
      }),
      updatedAt: statusChangedAt,
    };

    return updatedOrder;
  });

  if (!updatedOrder) return null;

  await writeJsonFile(ORDERS_FILE, nextOrders);
  return updatedOrder;
}

export async function updateStoredOrderTiming(orderId: string, payload: UpdateTimingPayload) {
  const orders = await getStoredOrders();
  let updatedOrder: ByteHiveOrder | null = null;
  const now = new Date().toISOString();

  const nextOrders = orders.map((order) => {
    if (order.id !== orderId) return order;

    const livePrepMinutes = getLivePrepMinutes(order);
    const nextPrepMinutes = payload.resetToBase
      ? order.basePrepMinutes
      : typeof payload.prepMinutes === "number"
        ? Math.max(0, Math.round(payload.prepMinutes))
        : livePrepMinutes;
    const nextDelayState = payload.delayState ?? order.delayState;
    const nextDelayMessage = payload.delayMessage === undefined ? order.delayMessage : payload.delayMessage;

    updatedOrder = {
      ...order,
      prepMinutes: nextPrepMinutes,
      delayState: nextDelayState,
      delayMessage: nextDelayState === "delayed" ? nextDelayMessage ?? "Sorry, your order will be late." : null,
      vendorTimingUpdatedAt: now,
      estimatedTime: deriveEstimatedTime({
        status: order.status,
        prepMinutes: nextPrepMinutes,
        delayState: nextDelayState,
        fulfillmentType: order.fulfillmentType,
        scheduledFor: order.scheduledFor ?? null,
      }),
      updatedAt: now,
    };

    return updatedOrder;
  });

  if (!updatedOrder) return null;

  await writeJsonFile(ORDERS_FILE, nextOrders);
  return updatedOrder;
}
