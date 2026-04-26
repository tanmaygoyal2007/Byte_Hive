import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { VendorOutletStatusRecord } from "@/features/vendor/services/vendor-portal.service";

const DATA_DIR = path.join(process.cwd(), "data", "runtime");
const VENDOR_STATUS_FILE = path.join(DATA_DIR, "vendor-statuses.json");

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

function normalizeStatuses(
  statuses: Record<string, boolean | VendorOutletStatusRecord>
): Record<string, VendorOutletStatusRecord> {
  const now = Date.now();

  return Object.entries(statuses).reduce<Record<string, VendorOutletStatusRecord>>((acc, [outlet, value]) => {
    const normalized = normalizeStatusRecord(value);
    const closedUntilTime = normalized.closedUntil ? new Date(normalized.closedUntil).getTime() : null;
    const expiredClosure = closedUntilTime !== null && closedUntilTime <= now;

    acc[outlet] = expiredClosure
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

export async function getStoredVendorStatuses() {
  const statuses = await readJsonFile<Record<string, boolean | VendorOutletStatusRecord>>(VENDOR_STATUS_FILE, {});
  const normalized = normalizeStatuses(statuses);

  if (JSON.stringify(statuses) !== JSON.stringify(normalized)) {
    await writeJsonFile(VENDOR_STATUS_FILE, normalized);
  }

  return normalized;
}

export async function replaceStoredVendorStatuses(
  statuses: Record<string, boolean | VendorOutletStatusRecord>
) {
  const normalized = normalizeStatuses(statuses);
  await writeJsonFile(VENDOR_STATUS_FILE, normalized);
  return normalized;
}
