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

export function getVendorOutletStatus(outlet = getVendorOutlet()) {
  const statuses = readJSON<Record<string, boolean>>(VENDOR_STATUS_KEY, {});
  if (!outlet) return true;
  return statuses[outlet] ?? true;
}

export function setVendorOutletStatus(isOpen: boolean, outlet = getVendorOutlet()) {
  if (!outlet) return;

  const statuses = readJSON<Record<string, boolean>>(VENDOR_STATUS_KEY, {});
  writeJSON(
    VENDOR_STATUS_KEY,
    {
      ...statuses,
      [outlet]: isOpen,
    },
    VENDOR_STATUS_EVENT
  );
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

export function getVendorLoginHref(outlet?: string) {
  if (!outlet) return "/vendor/login";
  return `/vendor/login?outlet=${encodeURIComponent(outlet)}`;
}

export function openVendorPortalWindow(outlet?: string) {
  if (typeof window === "undefined") return null;
  return window.open(getVendorLoginHref(outlet), "bytehive-vendor-portal", "popup=yes,width=1360,height=900,resizable=yes,scrollbars=yes");
}
