import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type DevMailboxMessage = {
  id: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "runtime");
const MAILBOX_FILE = path.join(DATA_DIR, "dev-mailbox.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readMailbox() {
  await ensureDataDir();

  try {
    const content = await readFile(MAILBOX_FILE, "utf8");
    return JSON.parse(content) as DevMailboxMessage[];
  } catch {
    return [];
  }
}

async function writeMailbox(messages: DevMailboxMessage[]) {
  await ensureDataDir();
  await writeFile(MAILBOX_FILE, JSON.stringify(messages, null, 2), "utf8");
}

export async function addMirroredEmail(message: Omit<DevMailboxMessage, "id" | "createdAt">) {
  const mailbox = await readMailbox();
  const nextMessage: DevMailboxMessage = {
    ...message,
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  await writeMailbox([nextMessage, ...mailbox].slice(0, 50));
  return nextMessage;
}

export async function getMirroredEmails() {
  return readMailbox();
}
