import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type VendorMenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
};

type VendorOrder = {
  orderId?: string;
  customerName?: string;
  status?: string;
  estimatedTime?: string;
  pickupLocation?: string;
  delayState?: "on-time" | "delayed";
  delayMessage?: string | null;
  prepMinutes?: number;
  basePrepMinutes?: number;
  vendorTimingUpdatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  total?: number;
  items?: Array<{
    name: string;
    quantity: number;
  }>;
};

type VendorContext = {
  outletName?: string;
  outletId?: string;
  location?: string;
  isOutletOpen?: boolean;
  isTemporarilyClosed?: boolean;
  closedUntil?: string | null;
  closureReason?: string | null;
  closureLabel?: string | null;
  menu?: VendorMenuItem[];
  activeOrders?: VendorOrder[];
  completedOrders?: VendorOrder[];
  stats?: {
    activeCount?: number;
    delayedCount?: number;
    readyCount?: number;
    acceptedCount?: number;
    newCount?: number;
    completedTodayCount?: number;
    averagePrepMinutesToday?: number | null;
  };
  topItems?: Array<{
    name: string;
    quantity: number;
  }>;
};

type VendorAction =
  | { type: "set_item_availability"; payload: { itemIds: string[]; isAvailable: boolean } }
  | { type: "set_item_price"; payload: { itemIds: string[]; price: number } }
  | { type: "adjust_price_percent"; payload: { itemIds: string[]; percent: number } }
  | {
      type: "create_menu_item";
      payload: { name: string; category: string; price: number; description?: string; isAvailable?: boolean };
    }
  | { type: "temporary_close_outlet"; payload: { durationMinutes: number; reason?: string | null } }
  | { type: "reopen_outlet"; payload: Record<string, never> };

function extractCloseDurationMinutes(normalizedQuery: string) {
  const hourMatch = normalizedQuery.match(/(?:next|for)?\s*(\d+)\s*(hour|hours|hr|hrs)/);
  if (hourMatch) {
    return Number.parseInt(hourMatch[1], 10) * 60;
  }

  const minuteMatch = normalizedQuery.match(/(?:next|for)?\s*(\d+)\s*(minute|minutes|min|mins)/);
  if (minuteMatch) {
    return Number.parseInt(minuteMatch[1], 10);
  }

  return null;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function formatPrepMinutes(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes));
  return rounded === 1 ? "1 minute" : `${rounded} minutes`;
}

function getRemainingMinutes(order: VendorOrder, now = Date.now()) {
  if (order.status === "ready" || order.status === "handoff" || order.status === "collected") {
    return 0;
  }

  const prepMinutes = Math.max(0, Math.round(order.prepMinutes ?? 0));
  if (order.delayState === "delayed") {
    return prepMinutes;
  }

  const anchorTime = new Date(order.vendorTimingUpdatedAt ?? order.createdAt ?? now).getTime();
  const targetTime = anchorTime + prepMinutes * 60_000;
  return Math.max(0, Math.ceil((targetTime - now) / 60_000));
}

function formatOrderLine(order: VendorOrder, now = Date.now()) {
  const etaLabel = order.delayState === "delayed"
    ? `Delayed at ${formatPrepMinutes(getRemainingMinutes(order, now))}`
    : order.estimatedTime ?? `About ${formatPrepMinutes(getRemainingMinutes(order, now))}`;
  return `#${order.orderId ?? "Unknown"} | ${order.customerName ?? "Customer"} | ${order.status ?? "unknown"} | ${etaLabel}`;
}

function getUrgentOrders(activeOrders: VendorOrder[], now = Date.now()) {
  return [...activeOrders]
    .map((order) => ({
      order,
      remainingMinutes: getRemainingMinutes(order, now),
      isDelayed: order.delayState === "delayed",
    }))
    .filter(({ order, remainingMinutes, isDelayed }) => {
      if (isDelayed) return true;
      return (order.status === "preparing" || order.status === "accepted") && remainingMinutes <= 5;
    })
    .sort((left, right) => {
      if (left.isDelayed !== right.isDelayed) return left.isDelayed ? -1 : 1;
      return left.remainingMinutes - right.remainingMinutes;
    });
}

function getNextOrder(activeOrders: VendorOrder[], now = Date.now()) {
  return [...activeOrders]
    .filter((order) => order.status === "preparing" || order.status === "accepted")
    .sort((left, right) => {
      const leftDelayed = left.delayState === "delayed";
      const rightDelayed = right.delayState === "delayed";
      if (leftDelayed !== rightDelayed) return leftDelayed ? -1 : 1;

      const leftRemaining = getRemainingMinutes(left, now);
      const rightRemaining = getRemainingMinutes(right, now);
      if (leftRemaining !== rightRemaining) return leftRemaining - rightRemaining;

      return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    })[0] ?? null;
}

function buildVendorSummary(context: VendorContext, now = Date.now()) {
  const activeOrders = context.activeOrders ?? [];
  const delayedOrders = activeOrders.filter((order) => order.delayState === "delayed");
  const urgentOrders = getUrgentOrders(activeOrders, now).slice(0, 5);
  const unavailableItems = (context.menu ?? []).filter((item) => item.isAvailable === false).map((item) => item.name);

  return [
    `Outlet: ${context.outletName ?? "Unknown"} (${context.isOutletOpen === false ? "Closed" : "Open"})`,
    `Location: ${context.location ?? "Unknown"}`,
    context.closureLabel ? `Closure: ${context.closureLabel}` : null,
    `Active orders: ${context.stats?.activeCount ?? activeOrders.length}`,
    `Delayed orders: ${context.stats?.delayedCount ?? delayedOrders.length}`,
    `Ready orders: ${context.stats?.readyCount ?? activeOrders.filter((order) => order.status === "ready").length}`,
    `Completed today: ${context.stats?.completedTodayCount ?? 0}`,
    `Average ETA today: ${context.stats?.averagePrepMinutesToday ? `${context.stats.averagePrepMinutesToday} minutes` : "Unavailable"}`,
    `Unavailable menu items: ${unavailableItems.length ? unavailableItems.join(", ") : "None"}`,
    `Top ordered items today: ${
      context.topItems?.length
        ? context.topItems.map((item) => `${item.name} (${item.quantity})`).join(", ")
        : "No trend data yet"
    }`,
    `Urgent orders: ${urgentOrders.length ? urgentOrders.map(({ order }) => formatOrderLine(order, now)).join(" || ") : "None"}`,
  ].filter(Boolean).join("\n");
}

function createQueueSummary(context: VendorContext, now = Date.now()) {
  const activeOrders = context.activeOrders ?? [];
  if (!activeOrders.length) {
    return `You have no active orders right now at ${context.outletName ?? "your outlet"}.`;
  }

  const urgentOrders = getUrgentOrders(activeOrders, now);
  const delayedOrders = activeOrders.filter((order) => order.delayState === "delayed");
  const readyOrders = activeOrders.filter((order) => order.status === "ready");
  const acceptedOrders = activeOrders.filter((order) => order.status === "accepted");
  const newOrders = activeOrders.filter((order) => order.status === "preparing");
  const nextOrder = getNextOrder(activeOrders, now);

  const lines = [
    `${context.outletName ?? "Your outlet"} currently has ${activeOrders.length} active order${activeOrders.length === 1 ? "" : "s"}.`,
    `New: ${newOrders.length}, Accepted: ${acceptedOrders.length}, Ready: ${readyOrders.length}, Delayed: ${delayedOrders.length}.`,
  ];

  if (nextOrder) {
    lines.push(`Prepare next: ${formatOrderLine(nextOrder, now)}.`);
  }

  if (urgentOrders.length) {
    lines.push("Needs attention:");
    for (const { order } of urgentOrders.slice(0, 3)) {
      lines.push(`- ${formatOrderLine(order, now)}`);
    }
  }

  return lines.join("\n");
}

function getMatchedCategory(menu: VendorMenuItem[], normalizedQuery: string) {
  const categories = Array.from(new Set(menu.map((item) => item.category.trim()).filter(Boolean)));
  return categories.find((category) => normalizedQuery.includes(normalize(category))) ?? null;
}

function getMatchedItems(menu: VendorMenuItem[], normalizedQuery: string) {
  const exact = menu.filter((item) => normalizedQuery.includes(normalize(item.name)));
  if (exact.length) return exact;

  const terms = normalizedQuery.split(" ").filter((term) => term.length >= 3);
  if (!terms.length) return [];

  return menu.filter((item) => {
    const haystack = normalize(`${item.name} ${item.category}`);
    return terms.every((term) => haystack.includes(term));
  });
}

function getTargetItems(menu: VendorMenuItem[], normalizedQuery: string) {
  const category = getMatchedCategory(menu, normalizedQuery);
  if (/\ball items\b|\bevery item\b|\bwhole menu\b|\ball menu items\b/.test(normalizedQuery)) {
    return { items: menu, category: null as string | null, targetLabel: "the full menu" };
  }

  if (category) {
    const categoryItems = menu.filter((item) => normalize(item.category) === normalize(category));
    return { items: categoryItems, category, targetLabel: `${category} items` };
  }

  const matchedItems = getMatchedItems(menu, normalizedQuery);
  if (matchedItems.length) {
    return {
      items: matchedItems,
      category: null as string | null,
      targetLabel: matchedItems.length === 1 ? matchedItems[0].name : `${matchedItems.length} matched items`,
    };
  }

  return { items: [] as VendorMenuItem[], category: null as string | null, targetLabel: "matching items" };
}

function buildActionReply(summary: string, action: VendorAction) {
  return {
    reply: `${summary}\n\nReply with Confirm to apply this change, or Cancel to skip it.`,
    action,
    source: "action-preview",
  };
}

function tryBuildVendorAction(query: string, context: VendorContext) {
  const normalizedQuery = normalize(query);
  const menu = context.menu ?? [];
  if (!menu.length) return null;

  if (/reopen outlet|open outlet|resume checkout|reopen now/.test(normalizedQuery)) {
    return buildActionReply(
      `I am ready to reopen ${context.outletName ?? "this outlet"} for checkout.`,
      { type: "reopen_outlet", payload: {} }
    );
  }

  const durationMinutes = extractCloseDurationMinutes(normalizedQuery);
  if (/\bclose\b/.test(normalizedQuery) && /\boutlet\b|\bshop\b|\bcanteen\b|\bthis\b/.test(normalizedQuery) && durationMinutes) {
    return buildActionReply(
      `I am ready to temporarily close ${context.outletName ?? "this outlet"} for ${durationMinutes >= 60 ? `${Math.round(durationMinutes / 60)} hour(s)` : `${durationMinutes} minute(s)`}.`,
      {
        type: "temporary_close_outlet",
        payload: {
          durationMinutes,
          reason: `Temporarily closed for ${durationMinutes} minutes.`,
        },
      }
    );
  }

  const addItemMatch = query.match(/add (?:a )?(?:new )?item(?: called)?\s+(.+?)\s+(?:in|under)\s+(.+?)\s+(?:for|at)\s+rs\.?\s*(\d+)/i);
  if (addItemMatch) {
    const [, name, category, price] = addItemMatch;
    return buildActionReply(
      `I am ready to add ${name.trim()} in ${category.trim()} at Rs ${price}.`,
      {
        type: "create_menu_item",
        payload: {
          name: name.trim(),
          category: category.trim(),
          price: Number.parseInt(price, 10),
          isAvailable: true,
        },
      }
    );
  }

  const availabilityIntent = /\b(mark|make|set)\b/.test(normalizedQuery) && /\bavailable\b|\bunavailable\b/.test(normalizedQuery);
  if (availabilityIntent) {
    const isAvailable = /\bavailable\b/.test(normalizedQuery) && !/\bunavailable\b/.test(normalizedQuery);
    const target = getTargetItems(menu, normalizedQuery);

    if (!target.items.length) {
      return { reply: "I could not find the item or category you want to update. Try naming the item or category more specifically.", source: "logic" };
    }

    return buildActionReply(
      `I found ${target.items.length} item${target.items.length === 1 ? "" : "s"} in ${target.targetLabel}. They will be marked ${isAvailable ? "available" : "unavailable"}:\n- ${target.items.slice(0, 8).map((item) => item.name).join("\n- ")}`,
      {
        type: "set_item_availability",
        payload: {
          itemIds: target.items.map((item) => item.id),
          isAvailable,
        },
      }
    );
  }

  const percentMatch = normalizedQuery.match(/(increase|decrease|raise|reduce)(?: the)?(?: price| prices)?(?: of)? (.+?) by (\d+)%/);
  if (percentMatch) {
    const [, direction, rawTarget, percentLabel] = percentMatch;
    const percent = Number.parseInt(percentLabel, 10) * (/(decrease|reduce)/.test(direction) ? -1 : 1);
    const target = getTargetItems(menu, normalize(rawTarget));

    if (!target.items.length) {
      return { reply: "I could not find any menu items matching that bulk price update.", source: "logic" };
    }

    return buildActionReply(
      `I found ${target.items.length} item${target.items.length === 1 ? "" : "s"} in ${target.targetLabel}. Their prices will change by ${percent}%:\n- ${target.items
        .slice(0, 8)
        .map((item) => `${item.name}: Rs ${item.price}`)
        .join("\n- ")}`,
      {
        type: "adjust_price_percent",
        payload: {
          itemIds: target.items.map((item) => item.id),
          percent,
        },
      }
    );
  }

  const exactPriceMatch = query.match(/set (.+?) to rs\.?\s*(\d+)/i);
  if (exactPriceMatch) {
    const [, rawTarget, priceLabel] = exactPriceMatch;
    const target = getTargetItems(menu, normalize(rawTarget));
    const price = Number.parseInt(priceLabel, 10);

    if (!target.items.length) {
      return { reply: "I could not find the menu item or category you want to reprice.", source: "logic" };
    }

    return buildActionReply(
      `I found ${target.items.length} item${target.items.length === 1 ? "" : "s"} in ${target.targetLabel}. Their new price will be Rs ${price}.\n- ${target.items
        .slice(0, 8)
        .map((item) => `${item.name}: Rs ${item.price} → Rs ${price}`)
        .join("\n- ")}`,
      {
        type: "set_item_price",
        payload: {
          itemIds: target.items.map((item) => item.id),
          price,
        },
      }
    );
  }

  return null;
}

function answerVendorIntent(query: string, context: VendorContext) {
  const normalizedQuery = normalize(query);
  const activeOrders = context.activeOrders ?? [];
  const completedOrders = context.completedOrders ?? [];
  const now = Date.now();

  if (!context.outletName) {
    return "I could not find a logged-in outlet yet. Open the vendor dashboard first so I can read your queue.";
  }

  if (/summari[sz]e|queue|workload|dashboard|what s going on|whats going on/.test(normalizedQuery)) {
    return createQueueSummary(context, now);
  }

  if (/how many|count/.test(normalizedQuery) && /active order|order/.test(normalizedQuery)) {
    const activeCount = context.stats?.activeCount ?? activeOrders.length;
    const delayedCount = context.stats?.delayedCount ?? activeOrders.filter((order) => order.delayState === "delayed").length;
    const readyCount = context.stats?.readyCount ?? activeOrders.filter((order) => order.status === "ready").length;
    return `${context.outletName} has ${activeCount} active orders right now, with ${readyCount} ready and ${delayedCount} delayed.`;
  }

  if (/urgent|risk|attention|late/.test(normalizedQuery) && /order|queue/.test(normalizedQuery)) {
    const urgentOrders = getUrgentOrders(activeOrders, now);
    if (!urgentOrders.length) {
      return "No active orders look risky right now. Your queue is currently under control.";
    }

    return [
      "These orders need attention first:",
      ...urgentOrders.slice(0, 5).map(({ order }) => `- ${formatOrderLine(order, now)}`),
    ].join("\n");
  }

  if (/which order should i|what should i prepare next|prepare next|next order/.test(normalizedQuery)) {
    const nextOrder = getNextOrder(activeOrders, now);
    if (!nextOrder) {
      return "There are no preparing or accepted orders waiting in the queue right now.";
    }

    return [
      `Prepare this one next: ${formatOrderLine(nextOrder, now)}.`,
      nextOrder.items?.length
        ? `Items: ${nextOrder.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}`
        : "Items are not available for that order.",
    ].join("\n");
  }

  if (/delayed|delay/.test(normalizedQuery) && /order|queue|show|which/.test(normalizedQuery)) {
    const delayedOrders = activeOrders.filter((order) => order.delayState === "delayed");
    if (!delayedOrders.length) {
      return "No delayed orders are active right now.";
    }

    return [
      "Delayed orders:",
      ...delayedOrders.map((order) => {
        const note = order.delayMessage ? ` | Note: ${order.delayMessage}` : "";
        return `- ${formatOrderLine(order, now)}${note}`;
      }),
    ].join("\n");
  }

  if (/average eta|avg eta|average prep|prep time today/.test(normalizedQuery)) {
    const averagePrep = context.stats?.averagePrepMinutesToday;
    if (!averagePrep) {
      return "I do not have enough order history today to calculate a reliable average ETA yet.";
    }

    return `The average prep ETA for ${context.outletName} today is about ${averagePrep} minutes.`;
  }

  if (/completed today|completed order|collected today/.test(normalizedQuery)) {
    const completedTodayCount = context.stats?.completedTodayCount ?? completedOrders.length;
    return `${context.outletName} has completed ${completedTodayCount} order${completedTodayCount === 1 ? "" : "s"} today.`;
  }

  if (/unavailable|out of stock|disabled|hidden menu|not available/.test(normalizedQuery) && !/\bmark\b|\bmake\b|\bset\b/.test(normalizedQuery)) {
    const unavailableItems = (context.menu ?? []).filter((item) => item.isAvailable === false);
    if (!unavailableItems.length) {
      return "All current menu items are marked available right now.";
    }

    return [
      "These menu items are currently unavailable:",
      ...unavailableItems.slice(0, 10).map((item) => `- ${item.name}`),
    ].join("\n");
  }

  if (/top item|best seller|most ordered|popular today/.test(normalizedQuery)) {
    if (!context.topItems?.length) {
      return "There is not enough order data yet to identify popular items today.";
    }

    return [
      "Top ordered items today:",
      ...context.topItems.slice(0, 5).map((item) => `- ${item.name}: ${item.quantity} sold`),
    ].join("\n");
  }

  if (/open|closed|outlet status/.test(normalizedQuery)) {
    if (context.isTemporarilyClosed) {
      return `${context.outletName} is temporarily closed. ${context.closureLabel ?? "Checkout is paused right now."}`;
    }
    return `${context.outletName} is currently ${context.isOutletOpen === false ? "closed" : "open"}.`;
  }

  if (/draft|write|create/.test(normalizedQuery) && /delay message|delay note|apology/.test(normalizedQuery)) {
    const delayedOrders = activeOrders.filter((order) => order.delayState === "delayed");
    const estimatedExtraTime = delayedOrders.length
      ? Math.max(...delayedOrders.map((order) => getRemainingMinutes(order, now)))
      : 10;

    return `Suggested delay note: "Sorry, your order is taking a little longer than expected. We are actively preparing it and expect it to be ready in about ${formatPrepMinutes(estimatedExtraTime)}. Thank you for your patience."`;
  }

  return null;
}

async function parseUpstreamError(response: Response) {
  try {
    const error = await response.json();
    return error.error?.message || "Groq API error";
  } catch {
    return "Groq API error";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages?: ChatMessage[];
      orderContext?: VendorContext | null;
    };

    const messages = body.messages ?? [];
    const vendorContext = body.orderContext ?? null;
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

    if (!vendorContext) {
      return NextResponse.json({ reply: "I could not read the vendor dashboard context yet. Please reload the vendor portal and try again." });
    }

    const actionPreview = tryBuildVendorAction(latestUserMessage, vendorContext);
    if (actionPreview) {
      return NextResponse.json(actionPreview);
    }

    const directReply = answerVendorIntent(latestUserMessage, vendorContext);
    if (directReply) {
      return NextResponse.json({ reply: directReply, source: "logic" });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        reply: "I can answer live queue, delay, menu availability, and outlet status questions right now. For deeper AI summaries, the vendor AI key still needs to be configured.",
        source: "logic-fallback",
      });
    }

    const systemPrompt = `You are ByteBot Vendor Copilot, an operations assistant for ByteHive canteen vendors.

You help outlet staff manage order flow, delays, menu availability, pricing decisions, and shift insights.

Rules:
- Be operational, concise, and action-oriented
- Use only the outlet data provided below as the source of truth
- Never invent orders, menu items, counts, or statuses
- Prefer short summaries with the most important items first
- If something is missing from the data, say so plainly
- When suggesting actions, keep them practical for a canteen vendor
- Do not answer as a customer-facing food recommendation bot

Current outlet summary:
${buildVendorSummary(vendorContext)}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 500,
        temperature: 0.2,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: await parseUpstreamError(response) },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
    return NextResponse.json({ reply, source: "llm" });
  } catch (error) {
    console.error("Vendor chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
