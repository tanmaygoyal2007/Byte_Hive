import { getOutletIdByName } from "@/features/orders/services/order-portal.service";
import { getCurrentAuthUser } from "@/features/auth/services/auth.service";

export const VENDOR_OUTLETS = [
  "Taste of Delhi",
  "Punjabi Bites",
  "Rolls Lane",
  "Cafe Coffee Day",
  "Amritsari Haveli",
  "Gianis",
  "Southern Delights",
  "Bites & Brews",
  "Domino's",
] as const;

const VENDOR_OUTLET_KEY = "vendorOutlet";
const VENDOR_STATUS_KEY = "vendorOutletOpen";
const VENDOR_STATUS_EVENT = "bytehive-vendor-status-updated";
const VENDOR_SESSION_EVENT = "bytehive-vendor-session-updated";
const VENDOR_STATUS_API_PATH = "/api/vendor-status";
const VENDOR_STATUS_SYNC_INTERVAL_MS = 2500;
const MIN_SYNC_INTERVAL_MS = 1500;

let vendorStatusSyncTimer: number | null = null;
let vendorStatusSubscriberCount = 0;
let vendorStatusSyncInFlight: Promise<void> | null = null;
let lastVendorStatusSync = 0;

export interface VendorOutletStatusRecord {
  isOpen: boolean;
  closedUntil?: string | null;
  closureReason?: string | null;
  closureMode?: "scheduled" | "manual" | null;
}

export interface VendorOutletStatusInfo {
  isOpen: boolean;
  isTemporarilyClosed: boolean;
  isManuallyClosed: boolean;
  closedUntil: string | null;
  closureReason: string | null;
  closureMode: "scheduled" | "manual" | null;
}

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

function writeJSON<T>(key: string, value: T, eventName?: string) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName));
    }
  } catch (error) {
    console.error(`Unable to save ${key}:`, error);
  }
}

export function getVendorOutlet() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(VENDOR_OUTLET_KEY) ?? "";
}

export function isVendorSessionAuthorized() {
  if (typeof window === "undefined") return false;
  return Boolean(getVendorOutlet()) && !getCurrentAuthUser();
}

export function getVendorOutletId(outlet = getVendorOutlet()) {
  return getOutletIdByName(outlet);
}

export function setVendorOutlet(outlet: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VENDOR_OUTLET_KEY, outlet);
  window.dispatchEvent(new CustomEvent(VENDOR_SESSION_EVENT));
}

export function clearVendorSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VENDOR_OUTLET_KEY);
  window.dispatchEvent(new CustomEvent(VENDOR_SESSION_EVENT));
}

function normalizeStatusRecord(value: boolean | VendorOutletStatusRecord | undefined): VendorOutletStatusRecord {
  if (typeof value === "boolean") {
    return {
      isOpen: value,
      closedUntil: null,
      closureReason: null,
      closureMode: null,
    };
  }

  return {
    isOpen: value?.isOpen ?? true,
    closedUntil: value?.closedUntil ?? null,
    closureReason: value?.closureReason ?? null,
    closureMode: value?.closureMode ?? null,
  };
}

function normalizeStatuses(statuses: Record<string, boolean | VendorOutletStatusRecord>) {
  const now = Date.now();
  return Object.entries(statuses).reduce<Record<string, VendorOutletStatusRecord>>((acc, [outlet, value]) => {
    const normalized = normalizeStatusRecord(value);
    const closedUntilTime = normalized.closedUntil ? new Date(normalized.closedUntil).getTime() : null;
    const expired = closedUntilTime !== null && closedUntilTime <= now;

    acc[outlet] = expired
      ? {
          isOpen: true,
          closedUntil: null,
          closureReason: null,
          closureMode: null,
        }
      : normalized;

    return acc;
  }, {});
}

function getStoredVendorStatuses() {
  return normalizeStatuses(readJSON<Record<string, boolean | VendorOutletStatusRecord>>(VENDOR_STATUS_KEY, {}));
}

function saveVendorStatuses(statuses: Record<string, boolean | VendorOutletStatusRecord>) {
  writeJSON(VENDOR_STATUS_KEY, normalizeStatuses(statuses), VENDOR_STATUS_EVENT);
}

function replaceVendorStatusesSnapshot(statuses: Record<string, boolean | VendorOutletStatusRecord>) {
  const normalized = normalizeStatuses(statuses);
  const current = getStoredVendorStatuses();

  if (JSON.stringify(current) === JSON.stringify(normalized)) {
    return normalized;
  }

  saveVendorStatuses(normalized);
  return normalized;
}

async function fetchVendorStatusesSnapshot() {
  const response = await fetch(VENDOR_STATUS_API_PATH, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to fetch vendor statuses.");
  }

  return (await response.json()) as Record<string, boolean | VendorOutletStatusRecord>;
}

async function pushVendorStatusesSnapshot(statuses: Record<string, boolean | VendorOutletStatusRecord>) {
  const response = await fetch(VENDOR_STATUS_API_PATH, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ statuses }),
  });

  if (!response.ok) {
    throw new Error("Unable to save shared vendor status snapshot.");
  }

  return (await response.json()) as Record<string, boolean | VendorOutletStatusRecord>;
}

export async function syncVendorStatusesFromServer(force = false) {
  if (typeof window === "undefined") return getStoredVendorStatuses();

  const now = Date.now();
  if (!force && (vendorStatusSyncInFlight || now - lastVendorStatusSync < MIN_SYNC_INTERVAL_MS)) {
    if (vendorStatusSyncInFlight) await vendorStatusSyncInFlight;
    return getStoredVendorStatuses();
  }
  lastVendorStatusSync = now;

  vendorStatusSyncInFlight = (async () => {
    try {
      const localStatuses = getStoredVendorStatuses();
      let snapshot = await fetchVendorStatusesSnapshot();

      if (Object.keys(snapshot).length === 0 && Object.keys(localStatuses).length > 0) {
        snapshot = await pushVendorStatusesSnapshot(localStatuses);
      }

      replaceVendorStatusesSnapshot(snapshot);
    } catch (error) {
      console.error("Unable to sync vendor statuses from server:", error);
    }
  })();

  await vendorStatusSyncInFlight;
  vendorStatusSyncInFlight = null;
  return getStoredVendorStatuses();
}

async function updateVendorStatuses(
  updater: (statuses: Record<string, VendorOutletStatusRecord>) => Record<string, VendorOutletStatusRecord>
) {
  const current = getStoredVendorStatuses();
  const next = normalizeStatuses(updater(current));
  saveVendorStatuses(next);

  try {
    const saved = await pushVendorStatusesSnapshot(next);
    replaceVendorStatusesSnapshot(saved);
  } catch (error) {
    console.error("Unable to sync vendor status update:", error);
  }

  return next;
}

export function getVendorOutletStatusInfo(outlet = getVendorOutlet()): VendorOutletStatusInfo {
  if (!outlet) {
    return {
      isOpen: true,
      isTemporarilyClosed: false,
      isManuallyClosed: false,
      closedUntil: null,
      closureReason: null,
      closureMode: null,
    };
  }

  const normalized = normalizeStatusRecord(getStoredVendorStatuses()[outlet]);
  const closedUntilTime = normalized.closedUntil ? new Date(normalized.closedUntil).getTime() : null;
  const isTemporarilyClosed = closedUntilTime !== null && closedUntilTime > Date.now();
  const isManuallyClosed = normalized.isOpen === false && !isTemporarilyClosed;

  return {
    isOpen: normalized.isOpen && !isTemporarilyClosed && !isManuallyClosed,
    isTemporarilyClosed,
    isManuallyClosed,
    closedUntil: isTemporarilyClosed ? normalized.closedUntil ?? null : null,
    closureReason: normalized.closureReason ?? null,
    closureMode: normalized.closureMode ?? null,
  };
}

export function getVendorOutletStatus(outlet = getVendorOutlet()) {
  return getVendorOutletStatusInfo(outlet).isOpen;
}

export async function setVendorOutletStatus(isOpen: boolean, outlet = getVendorOutlet()) {
  if (!outlet) return;

  await updateVendorStatuses((statuses) => ({
    ...statuses,
    [outlet]: {
      isOpen,
      closedUntil: null,
      closureReason: null,
      closureMode: null,
    },
  }));
}

export async function setVendorTemporaryClosure(
  durationMinutes: number,
  outlet = getVendorOutlet(),
  closureReason?: string | null
) {
  if (!outlet) return;

  const closedUntil = new Date(Date.now() + Math.max(1, Math.round(durationMinutes)) * 60_000).toISOString();
  await updateVendorStatuses((statuses) => ({
    ...statuses,
    [outlet]: {
      isOpen: false,
      closedUntil,
      closureReason: closureReason?.trim() || `Temporarily closed for ${Math.max(1, Math.round(durationMinutes))} minutes.`,
      closureMode: "scheduled",
    },
  }));
}

export async function setVendorScheduledClosure(
  closedUntil: string,
  outlet = getVendorOutlet(),
  closureReason?: string | null
) {
  if (!outlet) return;

  await updateVendorStatuses((statuses) => ({
    ...statuses,
    [outlet]: {
      isOpen: false,
      closedUntil,
      closureReason: closureReason?.trim() || null,
      closureMode: "scheduled",
    },
  }));
}

export async function setVendorManualClosure(outlet = getVendorOutlet(), closureReason?: string | null) {
  if (!outlet) return;

  await updateVendorStatuses((statuses) => ({
    ...statuses,
    [outlet]: {
      isOpen: false,
      closedUntil: null,
      closureReason: closureReason?.trim() || "Closed until reopened manually.",
      closureMode: "manual",
    },
  }));
}

export async function clearVendorTemporaryClosure(outlet = getVendorOutlet()) {
  if (!outlet) return;
  await setVendorOutletStatus(true, outlet);
}

export function getVendorClosureLabel(outlet = getVendorOutlet()) {
  const status = getVendorOutletStatusInfo(outlet);
  if (status.isTemporarilyClosed && status.closedUntil) {
    const closedUntilDate = new Date(status.closedUntil);
    const now = new Date();
    const sameDay = closedUntilDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = closedUntilDate.toDateString() === tomorrow.toDateString();

    const timeLabel = closedUntilDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (sameDay) {
      return `Closed until ${timeLabel} today`;
    }

    if (isTomorrow) {
      return `Closed until ${timeLabel} tomorrow`;
    }

    const dateLabel = closedUntilDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: closedUntilDate.getFullYear() === now.getFullYear() ? undefined : "numeric",
    });

    return `Closed until ${dateLabel}, ${timeLabel}`;
  }

  if (status.isManuallyClosed) {
    return status.closureReason ?? "Closed until reopened manually";
  }

  return null;
}

export function getVendorClosureNotice(outlet = getVendorOutlet()) {
  const status = getVendorOutletStatusInfo(outlet);
  const notice = status.closureReason?.trim();
  return notice ? notice : null;
}

export function getVendorLocation(outlet: string) {
  const locations: Record<string, string> = {
    "Taste of Delhi": "Block C, Ground Floor",
    "Punjabi Bites": "Block A, Basement",
    "Rolls Lane": "Block B, Food Court",
    "Cafe Coffee Day": "Block D, Atrium",
    "Amritsari Haveli": "Block E, Ground Floor",
    Gianis: "Block F, Dessert Bay",
    "Southern Delights": "Block G, South Wing",
    "Bites & Brews": "Block H, Cafe Strip",
    "Domino's": "Block J, Campus Plaza",
  };

  return locations[outlet] ?? "Campus Food Court";
}

export function subscribeToVendorStatus(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === VENDOR_STATUS_KEY) callback();
  };

  window.addEventListener(VENDOR_STATUS_EVENT, callback as EventListener);
  window.addEventListener("storage", handleStorage);

  vendorStatusSubscriberCount += 1;
  if (vendorStatusSyncTimer === null) {
    vendorStatusSyncTimer = window.setInterval(() => {
      void syncVendorStatusesFromServer();
    }, VENDOR_STATUS_SYNC_INTERVAL_MS);
  }

  void syncVendorStatusesFromServer(true);

  return () => {
    window.removeEventListener(VENDOR_STATUS_EVENT, callback as EventListener);
    window.removeEventListener("storage", handleStorage);

    vendorStatusSubscriberCount = Math.max(0, vendorStatusSubscriberCount - 1);
    if (vendorStatusSubscriberCount === 0 && vendorStatusSyncTimer !== null) {
      window.clearInterval(vendorStatusSyncTimer);
      vendorStatusSyncTimer = null;
    }
  };
}

export function subscribeToVendorSession(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === VENDOR_OUTLET_KEY) callback();
  };

  window.addEventListener(VENDOR_SESSION_EVENT, callback as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(VENDOR_SESSION_EVENT, callback as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getVendorLoginHref(outlet?: string) {
  if (!outlet) return "/vendor/login";
  return `/vendor/login?outlet=${encodeURIComponent(outlet)}`;
}
