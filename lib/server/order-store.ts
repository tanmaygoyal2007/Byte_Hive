import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  getLivePrepMinutes,
  getOutletMetaById,
  type ByteHiveOrder,
  type ByteHiveOrderItem,
  type ByteHivePickupSegment,
  type OrderDelayState,
  type OrderStatus,
  type PickupPoint,
  type UserRole,
} from "@/features/orders/services/order-portal.service";

type OrderCounters = Record<string, number>;

type CreateOrderPayload = {
  paymentId?: string;
  outletId: string;
  customerName: string;
  customerRole: UserRole;
  items: ByteHiveOrderItem[];
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
const SPLIT_PICKUP_OUTLETS = new Set<string>(["punjabiBites", "southernDelight"]);

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
}) {
  if (order.status === "ready") return "Ready for pickup";
  if (order.status === "partially-collected") return "Partially collected";
  if (order.status === "handoff") return "Counter verification in progress";
  if (order.status === "collected") return "Collected";

  const timing = `About ${formatPrepMinutes(order.prepMinutes)}`;
  return order.delayState === "delayed" ? `Delayed | ${timing}` : timing;
}

function createPickupCodeSuffix() {
  return Array.from({ length: 2 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
}

function createPickupCode(sequenceNumber: number, suffix = createPickupCodeSuffix()) {
  return `${String(sequenceNumber).padStart(4, "0")}${suffix}`;
}

function createDeterministicPickupCode(sequenceNumber: number, seed: string) {
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const first = String.fromCharCode(97 + (hash % 26));
  const second = String.fromCharCode(97 + (Math.floor(hash / 26) % 26));
  return createPickupCode(sequenceNumber, `${first}${second}`);
}

function createDeterministicQrToken(seed: string) {
  const normalized = seed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `LEGACY${normalized.padEnd(12, "X").slice(0, 12)}`;
}

function getPickupSegmentLabel(pickupPoint: PickupPoint) {
  return pickupPoint === "vendor_stall" ? "Vendor Stall" : "Counter";
}

function shouldUseSplitPickup(outletId: string, items: ByteHiveOrderItem[]) {
  return SPLIT_PICKUP_OUTLETS.has(outletId) && items.some((item) => item.pickupPoint === "vendor_stall");
}

function getNormalizedPickupPoint(item: ByteHiveOrderItem, allowVendorStall: boolean): PickupPoint {
  return allowVendorStall && item.pickupPoint === "vendor_stall" ? "vendor_stall" : "counter";
}

function buildPickupSegments(
  outletId: string,
  items: ByteHiveOrderItem[],
  sequenceNumber: number,
  orderStatus: OrderStatus = "preparing"
): ByteHivePickupSegment[] {
  const supportsPickupPoints = shouldUseSplitPickup(outletId, items);
  const groupedPoints = Array.from(
    new Set(items.map((item) => getNormalizedPickupPoint(item, supportsPickupPoints)))
  ) as PickupPoint[];
  const orderedPoints = groupedPoints.sort((left, right) => (left === "counter" ? -1 : right === "counter" ? 1 : 0));

  return orderedPoints.map((pickupPoint) => ({
    id: pickupPoint,
    pickupPoint,
    label: getPickupSegmentLabel(pickupPoint),
    qrToken: getRandomToken(),
    pickupCode: createPickupCode(sequenceNumber),
    status: orderStatus === "handoff" || orderStatus === "collected" ? ("verified" as const) : ("pending" as const),
    verifiedAt: orderStatus === "handoff" || orderStatus === "collected" ? new Date().toISOString() : null,
  }));
}

function getPrimarySegment(pickupSegments: ByteHivePickupSegment[]) {
  return pickupSegments.find((segment) => segment.id === "counter") ?? pickupSegments[0] ?? null;
}

function normalizeOrderPickupData(order: ByteHiveOrder): ByteHiveOrder {
  const normalizedItems = order.items.map((item) => ({
    ...item,
    pickupPoint: shouldUseSplitPickup(order.outletId, order.items) ? item.pickupPoint ?? "counter" : item.pickupPoint,
  }));
  const pickupSegments: ByteHivePickupSegment[] =
    order.pickupSegments?.length
      ? order.pickupSegments.map((segment) => ({
          ...segment,
          label: segment.label ?? getPickupSegmentLabel(segment.pickupPoint),
          status:
            order.status === "collected" || segment.status === "verified"
              ? ("verified" as const)
              : ("pending" as const),
          verifiedAt:
            order.status === "collected" || segment.status === "verified"
              ? segment.verifiedAt ?? order.updatedAt
              : null,
        }))
      : buildPickupSegments(order.outletId, normalizedItems, order.sequenceNumber, order.status).map((segment) => ({
          ...segment,
          qrToken:
            segment.id === "counter"
              ? order.qrToken ?? segment.qrToken
              : createDeterministicQrToken(`${order.receiptNumber}-${segment.id}`),
          pickupCode:
            segment.id === "counter"
              ? order.pickupCode ?? segment.pickupCode
              : createDeterministicPickupCode(order.sequenceNumber, `${order.receiptNumber}-${segment.id}`),
          verifiedAt: segment.status === "verified" ? order.updatedAt : null,
        }));
  const primarySegment = getPrimarySegment(pickupSegments);

  return {
    ...order,
    items: normalizedItems,
    pickupSegments,
    pickupCode: primarySegment?.pickupCode ?? order.pickupCode,
    qrToken: primarySegment?.qrToken ?? order.qrToken,
  };
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
  return orders.map(normalizeOrderPickupData).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getStoredOrderById(orderId: string) {
  const orders = await getStoredOrders();
  return orders.find((order) => order.id === orderId || order.receiptNumber === orderId) ?? null;
}

export async function replaceStoredOrders(orders: ByteHiveOrder[]) {
  const normalized = [...orders].map(normalizeOrderPickupData).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
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
  const normalizedItems = payload.items.map((item) => ({
    ...item,
    pickupPoint: shouldUseSplitPickup(payload.outletId, payload.items) ? item.pickupPoint ?? "counter" : item.pickupPoint,
  }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes;
  const createdAt = new Date();
  const businessDate = getBusinessDate(createdAt);
  const sequenceNumber = await getNextSequenceNumber(payload.outletId, businessDate);
  const receiptNumber = createReceiptNumber(payload.outletId, businessDate, sequenceNumber);
  const now = createdAt.toISOString();
  const basePrepMinutes = parseEstimatedMinutes(outletMeta.estimatedTime);
  const pickupSegments = buildPickupSegments(payload.outletId, normalizedItems, sequenceNumber);
  const primarySegment = getPrimarySegment(pickupSegments);

  const order: ByteHiveOrder = {
    id: receiptNumber,
    receiptNumber,
    sequenceNumber,
    businessDate,
    pickupCode: primarySegment?.pickupCode ?? createPickupCode(sequenceNumber),
    paymentId: payload.paymentId,
    customerName: payload.customerName,
    customerRole: payload.customerRole,
    outletId: payload.outletId,
    outletName: outletMeta.name,
    pickupLocation: outletMeta.location,
    basePrepMinutes,
    prepMinutes: basePrepMinutes,
    estimatedTime: deriveEstimatedTime({
      status: "preparing",
      prepMinutes: basePrepMinutes,
      delayState: "on-time",
    }),
    delayState: "on-time",
    delayMessage: null,
    vendorTimingUpdatedAt: null,
    status: "preparing",
    qrToken: primarySegment?.qrToken ?? getRandomToken(),
    pickupSegments,
    createdAt: now,
    updatedAt: now,
    items: normalizedItems,
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

    const nextPickupSegments =
      status === "collected"
        ? order.pickupSegments.map((segment) => ({
            ...segment,
            status: "verified" as const,
            verifiedAt: segment.verifiedAt ?? new Date().toISOString(),
          }))
        : order.pickupSegments;

    updatedOrder = {
      ...order,
      prepMinutes: nextPrepMinutes,
      delayState: nextDelayState,
      delayMessage: status === "ready" || status === "handoff" || status === "collected" ? null : order.delayMessage,
      status,
      pickupSegments: nextPickupSegments,
      estimatedTime: deriveEstimatedTime({
        status,
        prepMinutes: nextPrepMinutes,
        delayState: nextDelayState,
      }),
      updatedAt: new Date().toISOString(),
    };

    return updatedOrder;
  });

  if (!updatedOrder) return null;

  await writeJsonFile(ORDERS_FILE, nextOrders);
  return updatedOrder;
}

export async function verifyStoredOrderPickupSegment(orderId: string, pickupSegmentId: PickupPoint) {
  const orders = await getStoredOrders();
  let updatedOrder: ByteHiveOrder | null = null;
  const now = new Date().toISOString();

  const nextOrders = orders.map((order) => {
    if (order.id !== orderId) return order;

    const targetSegment = order.pickupSegments.find((segment) => segment.id === pickupSegmentId);
    if (!targetSegment) return order;

    const nextPickupSegments = order.pickupSegments.map((segment) =>
      segment.id === pickupSegmentId
        ? {
            ...segment,
            status: "verified" as const,
            verifiedAt: now,
          }
        : segment
    );
    const allSegmentsVerified = nextPickupSegments.every((segment) => segment.status === "verified");
    const nextStatus: OrderStatus = allSegmentsVerified ? "handoff" : "partially-collected";

    updatedOrder = {
      ...order,
      pickupSegments: nextPickupSegments,
      status: nextStatus,
      prepMinutes: allSegmentsVerified ? 0 : order.prepMinutes,
      delayState: allSegmentsVerified ? "on-time" : order.delayState,
      delayMessage: allSegmentsVerified ? null : order.delayMessage,
      estimatedTime: deriveEstimatedTime({
        status: nextStatus,
        prepMinutes: allSegmentsVerified ? 0 : order.prepMinutes,
        delayState: allSegmentsVerified ? "on-time" : order.delayState,
      }),
      updatedAt: now,
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
      }),
      updatedAt: now,
    };

    return updatedOrder;
  });

  if (!updatedOrder) return null;

  await writeJsonFile(ORDERS_FILE, nextOrders);
  return updatedOrder;
}
