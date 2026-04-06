import { getOutletIdByName } from "./orderPortal";

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

export interface VendorOutletStatusRecord {
  isOpen: boolean;
  closedUntil?: string | null;
  closureReason?: string | null;
  closureMode?: "scheduled" | "manual";
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

function getStoredVendorStatuses() {
  return readJSON<Record<string, boolean | VendorOutletStatusRecord>>(VENDOR_STATUS_KEY, {});
}

function saveVendorStatuses(statuses: Record<string, boolean | VendorOutletStatusRecord>) {
  writeJSON(VENDOR_STATUS_KEY, statuses, VENDOR_STATUS_EVENT);
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

  const statuses = getStoredVendorStatuses();
  const normalized = normalizeStatusRecord(statuses[outlet]);
  const closedUntilTime = normalized.closedUntil ? new Date(normalized.closedUntil).getTime() : null;
  const isTemporarilyClosed = closedUntilTime !== null && closedUntilTime > Date.now();
  const isManuallyClosed = normalized.isOpen === false && !isTemporarilyClosed;

  if (!isTemporarilyClosed && normalized.closedUntil) {
    const nextStatuses = {
      ...statuses,
      [outlet]: {
        isOpen: true,
        closedUntil: null,
        closureReason: null,
        closureMode: null,
      },
    };
    saveVendorStatuses(nextStatuses);
    return {
      isOpen: true,
      isTemporarilyClosed: false,
      isManuallyClosed: false,
      closedUntil: null,
      closureReason: null,
      closureMode: null,
    };
  }

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

export function setVendorOutletStatus(isOpen: boolean, outlet = getVendorOutlet()) {
  if (!outlet) return;

  const statuses = getStoredVendorStatuses();
  saveVendorStatuses({
    ...statuses,
      [outlet]: {
        isOpen,
        closedUntil: null,
        closureReason: null,
        closureMode: null,
      },
  });
}

export function setVendorTemporaryClosure(durationMinutes: number, outlet = getVendorOutlet(), closureReason?: string | null) {
  if (!outlet) return;

  const statuses = getStoredVendorStatuses();
  const closedUntil = new Date(Date.now() + Math.max(1, Math.round(durationMinutes)) * 60_000).toISOString();
  saveVendorStatuses({
    ...statuses,
      [outlet]: {
        isOpen: false,
        closedUntil,
        closureReason: closureReason?.trim() || `Temporarily closed for ${Math.max(1, Math.round(durationMinutes))} minutes.`,
        closureMode: "scheduled",
      },
  });
}

export function setVendorScheduledClosure(closedUntil: string, outlet = getVendorOutlet(), closureReason?: string | null) {
  if (!outlet) return;

  const statuses = getStoredVendorStatuses();
  saveVendorStatuses({
    ...statuses,
    [outlet]: {
      isOpen: false,
      closedUntil,
      closureReason: closureReason?.trim() || null,
      closureMode: "scheduled",
    },
  });
}

export function setVendorManualClosure(outlet = getVendorOutlet(), closureReason?: string | null) {
  if (!outlet) return;

  const statuses = getStoredVendorStatuses();
  saveVendorStatuses({
    ...statuses,
    [outlet]: {
      isOpen: false,
      closedUntil: null,
      closureReason: closureReason?.trim() || "Closed until reopened manually.",
      closureMode: "manual",
    },
  });
}

export function clearVendorTemporaryClosure(outlet = getVendorOutlet()) {
  if (!outlet) return;
  setVendorOutletStatus(true, outlet);
}

export function getVendorClosureLabel(outlet = getVendorOutlet()) {
  const status = getVendorOutletStatusInfo(outlet);
  if (status.isTemporarilyClosed && status.closedUntil) {
    const closedUntilDate = new Date(status.closedUntil);
    const sameDay = closedUntilDate.toDateString() === new Date().toDateString();
    const dayLabel = sameDay ? "today" : "tomorrow";
    const timeLabel = closedUntilDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `Closed until ${timeLabel} ${dayLabel}`;
  }

  if (status.isManuallyClosed) {
    return status.closureReason ?? "Closed until reopened manually";
  }

  return null;
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

  return () => {
    window.removeEventListener(VENDOR_STATUS_EVENT, callback as EventListener);
    window.removeEventListener("storage", handleStorage);
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

export function openVendorPortalWindow(outlet?: string) {
  if (typeof window === "undefined") return null;
  return window.open(getVendorLoginHref(outlet), "bytehive-vendor-portal", "popup=yes,width=1360,height=900,resizable=yes,scrollbars=yes");
}
