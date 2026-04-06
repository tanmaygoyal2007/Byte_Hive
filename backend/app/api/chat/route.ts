import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  isVeg: boolean;
  canteenId: string;
  isAvailable?: boolean;
  image?: string;
  description?: string;
};

type OrderContext = {
  menu?: MenuItem[];
  userName?: string | null;
  userRole?: string | null;
  activeOrder?: {
    orderId?: string;
    outletName?: string;
    pickupLocation?: string;
    pickupCode?: string;
    status?: string;
    estimatedTime?: string;
    delayMessage?: string | null;
    items?: { name: string; quantity: number }[];
  } | null;
  activeOrders?: Array<{
    orderId?: string;
    outletName?: string;
    pickupLocation?: string;
    pickupCode?: string;
    status?: string;
    estimatedTime?: string;
    delayMessage?: string | null;
    items?: { name: string; quantity: number }[];
  }>;
  cart?: {
    itemCount?: number;
    total?: number;
    outletId?: string | null;
    items?: Array<{
      id?: string;
      name?: string;
      quantity?: number;
      canteenId?: string | null;
    }>;
  } | null;
};

type StudentChatAction = {
  type: "add_item_to_cart";
  payload: {
    itemId: string;
    quantity: number;
  };
};

type StudentActionResponse = {
  reply: string;
  action?: StudentChatAction;
};

const CANTEEN_LABELS: Record<string, string> = {
  punjabiBites: "Punjabi Bites",
  rollsLane: "Rolls Lane",
  tasteOfDelhi: "Taste of Delhi",
  cafeCoffeeDay: "Cafe Coffee Day",
  AmritsarHaveli: "Amritsari Haveli",
  southernDelight: "Southern Delights",
  bitesAndBrews: "Bites & Brews",
  dominos: "Domino's",
  gianis: "Gianis",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function extractBudget(query: string) {
  const match = query.match(/(?:under|below|within|less than|upto|up to)\s*(?:rs\.?|inr|rupees?)?\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractQuantity(query: string) {
  const explicit = query.match(/\b(?:add|order|get|buy)\s+(\d+)\b/i) ?? query.match(/\b(\d+)\s*(?:x|qty|quantity)\b/i);
  if (!explicit) return 1;
  return Math.max(1, Number.parseInt(explicit[1], 10) || 1);
}

function extractRequestedItemPhrase(query: string) {
  const cleaned = query
    .replace(/\b(?:please|can you|could you|would you|i want|i would like|for me)\b/gi, " ")
    .replace(/\b(?:add|put|get|buy|order)\b/gi, " ")
    .replace(/\bfrom\s+[a-z0-9\s&']+\b/gi, " ")
    .replace(/\b(?:to|into|in)\s+my\s+cart\b/gi, " ")
    .replace(/\b(?:to|into)\s+cart\b/gi, " ")
    .replace(/\b(?:my|the|a|an)\b/gi, " ")
    .replace(/\b(?:qty|quantity)\s*\d+\b/gi, " ")
    .replace(/\b\d+\s*(?:x)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalize(cleaned);
}

function hasUsablePrice(item: MenuItem) {
  return Number.isFinite(item.price) && item.price > 0;
}

function buildMenuSummary(menu: MenuItem[]) {
  const byCanteen = new Map<string, { total: number; available: number; veg: number; cheapest: number | null }>();

  for (const item of menu) {
    const current = byCanteen.get(item.canteenId) ?? { total: 0, available: 0, veg: 0, cheapest: null };
    current.total += 1;
    if (item.isAvailable !== false) current.available += 1;
    if (item.isVeg) current.veg += 1;
    if (hasUsablePrice(item) && (current.cheapest === null || item.price < current.cheapest)) {
      current.cheapest = item.price;
    }
    byCanteen.set(item.canteenId, current);
  }

  const summaryLines = Array.from(byCanteen.entries())
    .sort(([left], [right]) => (CANTEEN_LABELS[left] ?? left).localeCompare(CANTEEN_LABELS[right] ?? right))
    .map(([canteenId, stats]) => {
      const canteenName = CANTEEN_LABELS[canteenId] ?? canteenId;
      const cheapestLabel = stats.cheapest === null ? "priced items unavailable" : `cheapest Rs.${stats.cheapest}`;
      return `${canteenName}: ${stats.total} items, ${stats.available} available, ${stats.veg} veg, ${cheapestLabel}`;
    });

  return {
    total: menu.length,
    available: menu.filter((item) => item.isAvailable !== false).length,
    veg: menu.filter((item) => item.isVeg).length,
    lines: summaryLines,
  };
}

function selectRelevantMenuItems(menu: MenuItem[], userQuery: string) {
  const normalizedQuery = normalize(userQuery);
  const budget = extractBudget(userQuery);
  const queryTerms = normalizedQuery.split(" ").filter((term) => term.length >= 3);
  const wantsVeg = /\bveg(etarian)?\b/.test(normalizedQuery);
  const wantsNonVeg = /\bnon veg\b|\bnonveg\b|\bchicken\b|\begg\b|\bmeat\b|\bfish\b/.test(normalizedQuery);
  const wantsAvailable = /\bavailable\b|\bopen\b|\bright now\b|\btoday\b/.test(normalizedQuery);
  const matchedCanteens = Object.entries(CANTEEN_LABELS)
    .filter(([canteenId, label]) => normalizedQuery.includes(normalize(canteenId)) || normalizedQuery.includes(normalize(label)))
    .map(([canteenId]) => canteenId);

  let filtered = menu;

  if (matchedCanteens.length > 0) {
    filtered = filtered.filter((item) => matchedCanteens.includes(item.canteenId));
  }
  if (wantsVeg && !wantsNonVeg) {
    filtered = filtered.filter((item) => item.isVeg);
  }
  if (wantsNonVeg && !wantsVeg) {
    filtered = filtered.filter((item) => !item.isVeg);
  }
  if (budget !== null) {
    filtered = filtered.filter((item) => hasUsablePrice(item) && item.price <= budget);
  }
  if (wantsAvailable) {
    filtered = filtered.filter((item) => item.isAvailable !== false);
  }

  const scored = filtered
    .map((item) => {
      const haystack = normalize(`${item.name} ${item.category} ${CANTEEN_LABELS[item.canteenId] ?? item.canteenId}`);
      let score = 0;

      for (const term of queryTerms) {
        if (haystack.includes(term)) score += 3;
      }
      if (wantsVeg && item.isVeg) score += 2;
      if (wantsNonVeg && !item.isVeg) score += 2;
      if (budget !== null && hasUsablePrice(item) && item.price <= budget) score += 2;
      if (item.isAvailable !== false) score += 1;

      return { item, score };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if ((left.item.isAvailable !== false) !== (right.item.isAvailable !== false)) {
        return left.item.isAvailable === false ? 1 : -1;
      }
      return left.item.price - right.item.price;
    });

  const prioritized = scored.filter((entry) => entry.score > 0).map((entry) => entry.item);
  const fallback = scored.map((entry) => entry.item);
  const pool = (prioritized.length > 0 ? prioritized : fallback).slice(0, 60);

  return pool.map((item) => {
    const canteenName = CANTEEN_LABELS[item.canteenId] ?? item.canteenId;
    const availability = item.isAvailable === false ? "Unavailable" : "Available";
    const priceLabel = hasUsablePrice(item) ? `Rs.${item.price}` : "Price unavailable";
    return `${canteenName} | ${item.category} | ${item.name} | ${priceLabel} | ${
      item.isVeg ? "Veg" : "Non-Veg"
    } | ${availability}`;
  });
}

function scoreMenuItems(menu: MenuItem[], userQuery: string) {
  const normalizedQuery = normalize(userQuery);
  const budget = extractBudget(userQuery);
  const queryTerms = normalizedQuery.split(" ").filter((term) => term.length >= 3);
  const wantsVeg = /\bveg(etarian)?\b/.test(normalizedQuery);
  const wantsNonVeg = /\bnon veg\b|\bnonveg\b|\bchicken\b|\begg\b|\bmeat\b|\bfish\b/.test(normalizedQuery);
  const matchedCanteens = Object.entries(CANTEEN_LABELS)
    .filter(([canteenId, label]) => normalizedQuery.includes(normalize(canteenId)) || normalizedQuery.includes(normalize(label)))
    .map(([canteenId]) => canteenId);

  let filtered = menu.filter((item) => item.isAvailable !== false && hasUsablePrice(item));

  if (matchedCanteens.length > 0) {
    filtered = filtered.filter((item) => matchedCanteens.includes(item.canteenId));
  }
  if (wantsVeg && !wantsNonVeg) {
    filtered = filtered.filter((item) => item.isVeg);
  }
  if (wantsNonVeg && !wantsVeg) {
    filtered = filtered.filter((item) => !item.isVeg);
  }
  if (budget !== null) {
    filtered = filtered.filter((item) => item.price <= budget);
  }

  return filtered
    .map((item) => {
      const haystack = normalize(
        `${item.name} ${item.category} ${CANTEEN_LABELS[item.canteenId] ?? item.canteenId} ${item.description ?? ""}`
      );
      let score = 0;

      for (const term of queryTerms) {
        if (haystack.includes(term)) score += 4;
      }
      if (normalizedQuery.includes(normalize(item.name))) score += 10;
      if (normalizedQuery.includes(normalize(item.category))) score += 3;
      if (wantsVeg && item.isVeg) score += 2;
      if (wantsNonVeg && !item.isVeg) score += 2;
      if (budget !== null && item.price <= budget) score += 2;

      return { item, score };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.item.price - right.item.price;
    });
}

function buildCartSummary(orderContext: OrderContext | null) {
  const cart = orderContext?.cart;
  if (!cart?.itemCount) {
    return "Cart is currently empty.";
  }

  const outletName = cart.outletId ? CANTEEN_LABELS[cart.outletId] ?? cart.outletId : "Unknown outlet";
  const itemsLabel = cart.items?.length
    ? cart.items.map((item) => `${item.quantity ?? 1}x ${item.name ?? "Item"}`).join(", ")
    : "Items not provided";

  return `Cart: ${cart.itemCount} item(s), total approx Rs.${cart.total ?? 0}, outlet ${outletName}. Items: ${itemsLabel}`;
}

function buildNearbyMenuSuggestions(menu: MenuItem[], userQuery: string) {
  return scoreMenuItems(menu, userQuery)
    .filter((entry) => entry.score > 0)
    .slice(0, 3)
    .map(({ item }) => `${item.name} from ${CANTEEN_LABELS[item.canteenId] ?? item.canteenId} for Rs.${item.price}`);
}

function maybeBuildStudentAction(
  latestUserMessage: string,
  orderContext: OrderContext | null
): StudentActionResponse | null {
  const menu = orderContext?.menu ?? [];
  const wantsAddToCart =
    /\badd\b.*\bcart\b/i.test(latestUserMessage) ||
    /\bput\b.*\bcart\b/i.test(latestUserMessage) ||
    /\b(?:order|get|buy)\b/i.test(latestUserMessage) ||
    (
      /\badd\b/i.test(latestUserMessage) &&
      (
        /\bfrom\b/i.test(latestUserMessage) ||
        /\bmenu\b/i.test(latestUserMessage) ||
        normalize(latestUserMessage).split(" ").length >= 2
      )
    );

  if (!wantsAddToCart || menu.length === 0) {
    return null;
  }

  const ranked = scoreMenuItems(menu, latestUserMessage);
  const bestMatch = ranked[0];
  const requestedItemPhrase = extractRequestedItemPhrase(latestUserMessage);
  const exactNameMatch = requestedItemPhrase
    ? menu.find((item) => normalize(item.name) === requestedItemPhrase && item.isAvailable !== false && hasUsablePrice(item))
    : null;

  const chosenMatch = exactNameMatch ? { item: exactNameMatch, score: 999 } : bestMatch;
  const hasStrongMatch =
    Boolean(chosenMatch) &&
    (Boolean(exactNameMatch) ||
      (
        Boolean(requestedItemPhrase) &&
        normalize(chosenMatch!.item.name).includes(requestedItemPhrase) &&
        requestedItemPhrase.length >= 3
      ) ||
      (chosenMatch?.score ?? 0) >= 10);

  if (!chosenMatch || !hasStrongMatch) {
    const suggestions = buildNearbyMenuSuggestions(menu, latestUserMessage);
    return {
      reply: suggestions.length
        ? `I couldn't find that exact item on the current menu, so I didn't add anything. You can try one of these instead:\n- ${suggestions.join("\n- ")}`
        : "I couldn't find that exact item on the current menu, so I didn't add anything. Try asking with the exact menu item name or browse the menu list first.",
    };
  }

  const quantity = extractQuantity(latestUserMessage);
  const item = chosenMatch.item;
  const outletName = CANTEEN_LABELS[item.canteenId] ?? item.canteenId;
  const cartOutletId = orderContext?.cart?.outletId ?? null;
  const hasExistingCart = Boolean(cartOutletId);
  const isDifferentCartOutlet = hasExistingCart && cartOutletId !== item.canteenId;
  const quantityLabel = quantity === 1 ? item.name : `${quantity} x ${item.name}`;

  if (isDifferentCartOutlet) {
    const currentOutletName = CANTEEN_LABELS[cartOutletId ?? ""] ?? cartOutletId;
    return {
      reply: `I didn't add anything because your cart already has items from ${currentOutletName}. ByteHive only allows one outlet per cart, so you can either finish or clear that cart first, or ask me for something from ${currentOutletName}.`,
    };
  }

  return {
    reply: `I can add ${quantityLabel} from ${outletName} to your cart for Rs.${item.price}${quantity > 1 ? ` each` : ""}. Reply with Confirm to continue or Cancel to keep things as they are.`,
    action: {
      type: "add_item_to_cart",
      payload: {
        itemId: item.id,
        quantity,
      },
    },
  };
}

function buildOrderContextSummary(orderContext: OrderContext | null) {
  if (!orderContext?.activeOrders?.length && !orderContext?.activeOrder) {
    return "No active order.";
  }

  const activeOrders = orderContext.activeOrders?.length
    ? orderContext.activeOrders
    : orderContext.activeOrder
      ? [orderContext.activeOrder]
      : [];

  return activeOrders
    .map((order, index) => {
      const itemsLabel = order.items?.length
        ? order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")
        : "Items not provided";

      return [
        `Order ${index + 1}:`,
        `- Order ID: ${order.orderId ?? "Unknown"}`,
        `- Outlet: ${order.outletName ?? "Unknown"}`,
        `- Status: ${order.status ?? "Unknown"}`,
        `- Estimated pickup: ${order.estimatedTime ?? "Unknown"}`,
        `- Pickup location: ${order.pickupLocation ?? "Unknown"}`,
        `- Pickup code: ${order.pickupCode ?? "Unavailable"}`,
        `- Delay note: ${order.delayMessage ?? "None"}`,
        `- Items: ${itemsLabel}`,
      ].join("\n");
    })
    .join("\n");
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
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
    }

    const body = (await req.json()) as {
      messages?: ChatMessage[];
      orderContext?: OrderContext | null;
    };

    const messages = body.messages ?? [];
    const orderContext = body.orderContext ?? null;
    const menu = orderContext?.menu ?? [];
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

    const menuSummary = buildMenuSummary(menu);
    const relevantMenuLines = selectRelevantMenuItems(menu, latestUserMessage);
    const orderSummary = buildOrderContextSummary(orderContext);
    const cartSummary = buildCartSummary(orderContext);
    const studentAction = maybeBuildStudentAction(latestUserMessage, orderContext);

    if (studentAction) {
      return NextResponse.json(studentAction);
    }

    const systemPrompt = `You are ByteBot, a friendly AI food assistant for ByteHive campus.

You are connected to the full canteen menu data provided by the frontend and should use it as the source of truth.

Full menu summary:
- Total menu items: ${menuSummary.total}
- Available now: ${menuSummary.available}
- Vegetarian items: ${menuSummary.veg}
${menuSummary.lines.map((line) => `- ${line}`).join("\n")}

Relevant menu items for the current question:
${relevantMenuLines.length > 0 ? relevantMenuLines.join("\n") : "No relevant menu items matched the current question."}

Rules:
- Only mention items that exist in the provided menu data
- Always mention price and canteen name when recommending items
- Treat any item with price 0 or missing price as price-unavailable, not free
- Do not recommend price-unavailable items for cheapest, budget, or low-cost requests
- Respect item availability when asked about what is available right now
- If the user asks for vegetarian food, only mention vegetarian items
- Use the current order context exactly as provided when answering order tracking, pickup, ETA, delay, or collection questions
- If there is no active order, clearly say that no live order was found instead of guessing
- If an order has a delay note, mention it when the user asks about timing or status
- If the user asks where to collect an order, answer with the pickup location from the order context
- If the user asks how long an order will take, use the estimated pickup value from the order context
- If the user asks for a pickup code, only use the code from the order context
- Never claim an item was added to the cart, ordered, booked, or changed unless a structured chat action has already executed outside this prompt
- For cart-changing requests that are not already handled before this prompt, explain what is available but do not pretend the cart was updated
- Keep answers concise and helpful
- Use bullet points when listing multiple items
- If the request is broad and there are many matches, summarize the options instead of trying to list everything

Current order context:
${orderSummary}

Current cart context:
${cartSummary}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 700,
        temperature: 0.4,
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

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
