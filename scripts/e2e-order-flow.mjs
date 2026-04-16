import { chromium } from "playwright";

const BASE_URL = process.env.BYTEHIVE_BASE_URL || "http://127.0.0.1:3000";

function getBusinessDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

function buildSeedOrder() {
  const now = new Date();
  const businessDate = getBusinessDate(now);
  const createdAt = now.toISOString();
  const updatedAt = createdAt;
  const outletId = "punjabiBites";
  const receiptNumber = `PB-${businessDate}-001`;
  const items = [
    { id: "pb-butter-naan", name: "Butter Naan", quantity: 2, price: 25 },
    { id: "pb-paneer-butter-masala", name: "Paneer Butter Masala", quantity: 1, price: 180 },
  ];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes;

  return {
    id: receiptNumber,
    receiptNumber,
    sequenceNumber: 1,
    businessDate,
    pickupCode: "0001",
    paymentId: "pay_seeded_flow",
    customerName: "Devraj Test",
    customerRole: "student",
    outletId,
    outletName: "Punjabi Bites",
    pickupLocation: "Block A, Basement",
    basePrepMinutes: 15,
    prepMinutes: 15,
    estimatedTime: "About 15 minutes",
    delayState: "on-time",
    delayMessage: null,
    vendorTimingUpdatedAt: null,
    status: "preparing",
    qrToken: "TESTTOKEN001",
    createdAt,
    updatedAt,
    items,
    subtotal,
    taxes,
    total,
  };
}

const seededOrder = buildSeedOrder();
const qrValue = `ByteHive|${seededOrder.outletId}|${seededOrder.receiptNumber}|${seededOrder.qrToken}`;

async function waitForOrderStatus(page, expectedStatus) {
  await page.waitForFunction(
    ({ orderId, status }) => {
      const raw = localStorage.getItem("bytehiveOrders");
      if (!raw) return false;
      const orders = JSON.parse(raw);
      return orders.some((order) => order.id === orderId && order.status === status);
    },
    { orderId: seededOrder.id, status: expectedStatus }
  );
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  await context.addInitScript((order) => {
    const seedKey = "__bytehive_e2e_seeded__";
    const authUser = {
      uid: "local-seeded-user",
      email: "devraj.test@christuniversity.in",
      password: "seeded-password",
      displayName: "Devraj Test",
      role: "student",
    };

    globalThis.__bytehiveAuthMemory = {
      currentUid: authUser.uid,
      roleByUid: new Map([[authUser.uid, "student"]]),
      users: [authUser],
    };

    const noop = () => undefined;
    const localStore = window.localStorage;
    if (!sessionStorage.getItem(seedKey)) {
      localStore.clear();
      localStore.setItem("vendorOutlet", "Punjabi Bites");
      localStore.setItem("vendorOutletOpen", JSON.stringify({
        "Punjabi Bites": {
          isOpen: true,
          closedUntil: null,
          closureReason: null,
          closureMode: null,
        },
      }));
      localStore.setItem("bytehiveOrders", JSON.stringify([order]));
      localStore.setItem("bytehiveOrderCounters", JSON.stringify({ [`${order.outletId}:${order.businessDate}`]: 1 }));
      localStore.removeItem("bytehiveReadyPromptState");
      localStore.removeItem("bytehiveDelayPromptState");
      sessionStorage.setItem(seedKey, "1");
    }

    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {},
        configurable: true,
      });
    }

    navigator.mediaDevices.getUserMedia = async () => {
      throw new Error("Camera blocked during automated test.");
    };

    window.alert = noop;
    window.prompt = () => null;
  }, seededOrder);

  const studentPage = await context.newPage();
  const vendorPage = await context.newPage();

  const results = [];

  try {
    await studentPage.goto(`${BASE_URL}/receipt?orderId=${encodeURIComponent(seededOrder.id)}`, { waitUntil: "networkidle" });
    await studentPage.getByText("Order Placed Successfully!").waitFor();
    await studentPage.getByText(seededOrder.id).waitFor();
    await studentPage.getByText(`Pickup code: ${seededOrder.pickupCode}`).waitFor();
    results.push("Receipt page loaded with seeded order, QR, and pickup code.");

    await vendorPage.goto(`${BASE_URL}/vendor/dashboard`, { waitUntil: "networkidle" });
    await vendorPage.getByText(`#${seededOrder.id}`).waitFor();
    await vendorPage.getByRole("button", { name: "Accept Order" }).click();
    await waitForOrderStatus(vendorPage, "accepted");
    await vendorPage.getByRole("button", { name: "Mark as Ready" }).click();
    await waitForOrderStatus(vendorPage, "ready");
    results.push("Vendor dashboard advanced the order from preparing to accepted to ready.");

    await studentPage.reload({ waitUntil: "networkidle" });
    const readyDialog = studentPage.getByRole("dialog", { name: "Order ready for pickup" });
    await readyDialog.waitFor();
    await readyDialog.getByText(`Order #${seededOrder.id} from ${seededOrder.outletName} is ready for pickup`).waitFor();
    await readyDialog.getByText(`Pickup code: ${seededOrder.pickupCode}`).waitFor();
    results.push("Student ready-for-pickup modal appeared after vendor marked the order ready.");

    await vendorPage.goto(`${BASE_URL}/vendor/qr`, { waitUntil: "networkidle" });
    await vendorPage.getByLabel("Pickup code, receipt number, or QR payload").fill(qrValue);
    await vendorPage.getByRole("button", { name: "Verify QR" }).click();
    await vendorPage.getByText("Order Verified").waitFor();
    await vendorPage.getByRole("button", { name: "Mark as Collected" }).click();
    await waitForOrderStatus(vendorPage, "handoff");
    results.push("Vendor QR screen verified the QR payload and moved the order to handoff.");

    await studentPage.reload({ waitUntil: "networkidle" });
    await studentPage.getByRole("dialog", { name: "Confirm order pickup" }).waitFor();
    await studentPage.getByRole("button", { name: "Yes, order picked" }).click();
    await waitForOrderStatus(studentPage, "collected");
    results.push("Student handoff confirmation completed and moved the order to collected.");

    await vendorPage.goto(`${BASE_URL}/vendor/dashboard`, { waitUntil: "networkidle" });
    await vendorPage.locator(".vendor-status-badge.vendor-status-collected").first().waitFor();
    await vendorPage.getByText(`#${seededOrder.id}`).waitFor();
    results.push("Vendor dashboard shows the order in the collected state.");

    const finalOrder = await studentPage.evaluate((orderId) => {
      const raw = localStorage.getItem("bytehiveOrders");
      if (!raw) return null;
      return JSON.parse(raw).find((order) => order.id === orderId) ?? null;
    }, seededOrder.id);

    console.log(JSON.stringify({
      ok: true,
      baseUrl: BASE_URL,
      orderId: seededOrder.id,
      qrValue,
      finalStatus: finalOrder?.status ?? null,
      pickupCode: finalOrder?.pickupCode ?? null,
      results,
    }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
