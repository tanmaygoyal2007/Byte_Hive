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
  labels?: string[];
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
  type: "add_item_to_cart" | "remove_item_from_cart";
  payload: {
    itemId?: string;
    itemName?: string;
    quantity?: number;
    items?: Array<{ itemId: string; quantity: number }>;
    itemNames?: string[];
    clearCart?: boolean;
  };
};

type StudentActionResponse = {
  reply: string;
  action?: StudentChatAction;
  redirect?: string;
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

function canteenLink(canteenId: string) {
  const name = CANTEEN_LABELS[canteenId] ?? canteenId;
  return `[${name}](/canteens/${canteenId})`;
}

const LABEL_ALIASES: Record<string, string[]> = {
  Spicy: ["spicy", "hot", "masaledar", "masala"],
  "Contains Dairy": ["contains dairy", "dairy", "milk", "paneer", "cheese", "cream", "butter"],
  "Served Cold": ["served cold", "cold", "chilled", "iced", "cool"],
  "Served Hot": ["served hot", "hot", "warm"],
  Sweet: ["sweet", "dessert", "sugary"],
  "Egg-based": ["egg", "egg based", "omelette", "omelet"],
  "High Protein": ["high protein", "protein", "protein rich"],
  "Light Bite": ["light bite", "light", "snack", "small bite"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function extractBudget(query: string) {
  const match = query.match(/(?:under|below|within|less than|upto|up to)\s*(?:rs\.?|inr|rupees?)?\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractQuantity(query: string) {
  const WORD_NUMBERS: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  const wordMatch = query.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  const explicit = query.match(/\b(?:add|order|get|buy)\s+(\d+)\b/i)
    ?? query.match(/\b(?:any|some|random)\s+(\d+)\b/i)
    ?? query.match(/\b(\d+)\s*(?:x|qty|quantity|item|items)\b/i);
  if (explicit) return Math.max(1, Number.parseInt(explicit[1], 10) || 1);
  if (wordMatch) return WORD_NUMBERS[wordMatch[1].toLowerCase()] ?? 1;
  return 1;
}

function extractRequestedItemPhrase(query: string) {
  const cleaned = query
    .replace(/\b(?:please|can you|could you|would you|i want|i would like|for me)\b/gi, " ")
    .replace(/\b(?:add|put|get|buy|order|remove|delete|clear)\b/gi, " ")
    .replace(/\b(?:take)\s+(?:out|off)\b/gi, " ")
    .replace(/\bfrom\s+[a-z0-9\s&']+\b/gi, " ")
    .replace(/\b(?:to|into)\s+my\s+cart\b/gi, " ")
    .replace(/\b(?:to|into)\s+cart\b/gi, " ")
    .replace(/\b(?:my|the|a|an|it|this|that|these|those|empty)\b/gi, " ")
    .replace(/\b(?:item|items|dish|dishes|food|order|orders|any|random|some|whatever)\b/gi, " ")
    .replace(/\b(?:qty|quantity)\s*\d+\b/gi, " ")
    .replace(/\b\d+\s*(?:x)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalize(cleaned);
}

function normalizeLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getRequestedLabels(query: string, menu: MenuItem[]) {
  const normalizedQuery = normalize(query);
  const menuLabels = Array.from(
    new Set(menu.flatMap((item) => item.labels ?? []).filter((label): label is string => Boolean(label?.trim())))
  );

  const matched = new Set<string>();

  for (const [label, aliases] of Object.entries(LABEL_ALIASES)) {
    const normalizedLabel = normalizeLabel(label);
    if (
      normalizedQuery.includes(normalizedLabel) ||
      aliases.some((alias) => normalizedQuery.includes(normalize(alias)))
    ) {
      matched.add(label);
    }
  }

  for (const label of menuLabels) {
    if (normalizedQuery.includes(normalizeLabel(label))) {
      matched.add(label);
    }
  }

  return Array.from(matched);
}

function itemHasRequestedLabels(item: MenuItem, requestedLabels: string[]) {
  if (!requestedLabels.length) return true;

  const itemLabels = new Set((item.labels ?? []).map(normalizeLabel));
  return requestedLabels.every((label) => itemLabels.has(normalizeLabel(label)));
}

function hasUsablePrice(item: MenuItem) {
  return Number.isFinite(item.price) && item.price > 0;
}

function levenshteinDistance(left: string, right: string) {
  const m = left.length;
  const n = right.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = left[i - 1] === right[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyFindMenuItem(menu: MenuItem[], phrase: string): MenuItem | null {
  if (!phrase || phrase.length < 2) return null;
  const normalizedPhrase = normalize(phrase);
  const candidates = menu
    .filter((item) => item.isAvailable !== false && hasUsablePrice(item))
    .map((item) => {
      const normalizedName = normalize(item.name);
      const nameWords = normalizedName.split(" ");
      const nameSim = nameWords.reduce((best, word) => {
        const dist = levenshteinDistance(normalizedPhrase, word);
        const len = Math.max(normalizedPhrase.length, word.length);
        return Math.max(best, len > 0 ? 1 - dist / len : 0);
      }, 0);
      const dist = levenshteinDistance(normalizedPhrase, normalizedName);
      const maxLen = Math.max(normalizedPhrase.length, normalizedName.length);
      const fullSim = maxLen > 0 ? 1 - dist / maxLen : 0;
      const similarity = Math.max(nameSim, fullSim);
      return { item, dist, similarity };
    })
    .filter((c) => c.similarity >= 0.6)
    .sort((left, right) => right.similarity - left.similarity || left.item.price - right.item.price);
  return candidates[0]?.item ?? null;
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
  const requestedLabels = getRequestedLabels(userQuery, menu);
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
  if (requestedLabels.length > 0) {
    filtered = filtered.filter((item) => itemHasRequestedLabels(item, requestedLabels));
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
      const labelText = (item.labels ?? []).join(" ");
      const haystack = normalize(`${item.name} ${item.category} ${CANTEEN_LABELS[item.canteenId] ?? item.canteenId} ${labelText}`);
      let score = 0;

      for (const term of queryTerms) {
        if (haystack.includes(term)) score += 3;
      }
      if (requestedLabels.length > 0 && itemHasRequestedLabels(item, requestedLabels)) score += 6;
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
    const labelSummary = item.labels?.length ? ` | Labels: ${item.labels.join(", ")}` : "";
    return `${canteenName} | ${item.category} | ${item.name} | ${priceLabel} | ${
      item.isVeg ? "Veg" : "Non-Veg"
    } | ${availability}${labelSummary}`;
  });
}

function scoreMenuItems(menu: MenuItem[], userQuery: string) {
  const normalizedQuery = normalize(userQuery);
  const budget = extractBudget(userQuery);
  const queryTerms = normalizedQuery.split(" ").filter((term) => term.length >= 3);
  const STOPWORDS = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can",
    "has", "had", "was", "got", "get", "say", "see", "use", "way",
    "want", "need", "buy", "put", "add", "order", "cart", "from",
    "my", "its", "how", "why", "what", "who", "where", "when",
    "will", "with", "have", "has", "had", "did", "does", "done",
    "just", "also", "very", "too", "now", "new", "any", "some",
    "show", "tell", "find", "give", "list", "look", "more",
    "this", "that", "these", "those", "here", "there",
    "empty", "clear", "remove", "delete", "check",
    "please", "thank", "thanks", "help", "info",
    "could", "would", "should", "might", "must",
    "any", "random", "some", "whatever", "outlet",
  ]);
  const contentTerms = queryTerms.filter((term) => !STOPWORDS.has(term));
  const effectiveTerms = contentTerms.length > 0 ? contentTerms : queryTerms;
  const requestedLabels = getRequestedLabels(userQuery, menu);
  const wantsVeg = /\bveg(etarian)?\b/.test(normalizedQuery);
  const wantsNonVeg = /\bnon veg\b|\bnonveg\b|\bchicken\b|\begg\b|\bmeat\b|\bfish\b/.test(normalizedQuery);
  const matchedCanteens = Object.entries(CANTEEN_LABELS)
    .filter(([canteenId, label]) => normalizedQuery.includes(normalize(canteenId)) || normalizedQuery.includes(normalize(label)))
    .map(([canteenId]) => canteenId);

  let filtered = menu.filter((item) => item.isAvailable !== false && hasUsablePrice(item));

  if (matchedCanteens.length > 0) {
    filtered = filtered.filter((item) => matchedCanteens.includes(item.canteenId));
  }
  if (requestedLabels.length > 0) {
    filtered = filtered.filter((item) => itemHasRequestedLabels(item, requestedLabels));
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
      const labelText = (item.labels ?? []).join(" ");
      const haystack = normalize(
        `${item.name} ${item.category} ${CANTEEN_LABELS[item.canteenId] ?? item.canteenId} ${item.description ?? ""} ${labelText}`
      );
      let score = 0;

      for (const term of queryTerms) {
        if (haystack.includes(term)) score += 4;
      }

      const normalizedName = normalize(item.name);
      if (normalizedQuery.includes(normalizedName)) score += 10;

      if (score === 0 && effectiveTerms.length > 0) {
        const fuzzyScore = effectiveTerms.reduce((max, term) => {
          const nameWords = normalizedName.split(" ");
          const wordSim = nameWords.reduce((best, word) => {
            const dist = levenshteinDistance(term, word);
            const len = Math.max(term.length, word.length);
            return Math.max(best, len > 0 ? 1 - dist / len : 0);
          }, 0);
          const fullDist = levenshteinDistance(term, normalizedName);
          const fullLen = Math.max(term.length, normalizedName.length);
          const fullSim = fullLen > 0 ? 1 - fullDist / fullLen : 0;
          const sim = Math.max(wordSim, fullSim);
          return Math.max(max, sim >= 0.6 ? sim * 8 : 0);
        }, 0);
        score += Math.round(fuzzyScore);
      }

      if (normalizedQuery.includes(normalize(item.category))) score += 3;
      if (requestedLabels.length > 0 && itemHasRequestedLabels(item, requestedLabels)) score += 8;
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
    .map(({ item }) => `${item.name} from ${canteenLink(item.canteenId)} for Rs.${item.price}`);
}

function maybeBuildLabelRecommendation(latestUserMessage: string, orderContext: OrderContext | null): StudentActionResponse | null {
  const menu = orderContext?.menu ?? [];
  if (!menu.length) return null;

  const requestedLabels = getRequestedLabels(latestUserMessage, menu);
  if (!requestedLabels.length) return null;

  const normalizedQuery = normalize(latestUserMessage);
  const isDiscoveryIntent =
    /\b(show|tell|suggest|recommend|find|what|which|any|some|give)\b/i.test(latestUserMessage) ||
    /\bfood\b|\bitem\b|\bdish\b|\bmeal\b/.test(normalizedQuery);

  if (!isDiscoveryIntent) return null;

  const matches = scoreMenuItems(menu, latestUserMessage)
    .filter(({ item }) => itemHasRequestedLabels(item, requestedLabels))
    .slice(0, 5)
    .map(({ item }) => item);

  if (!matches.length) {
    return {
      reply: `I couldn't find any available items matching the ${requestedLabels.join(", ")} label${requestedLabels.length > 1 ? "s" : ""} right now.`,
    };
  }

  const reply = [
    `Here are some ${requestedLabels.join(", ").toLowerCase()} options you can try:`,
    ...matches.map((item) => `- ${item.name} from ${canteenLink(item.canteenId)} for Rs.${item.price}`),
  ].join("\n");

  return { reply };
}

function maybeBuildStudentAction(
  latestUserMessage: string,
  orderContext: OrderContext | null
): StudentActionResponse | null {
  const menu = orderContext?.menu ?? [];
  const wantsAddToCart =
    /\badd\b.*\bcart\b/i.test(latestUserMessage) ||
    /\bput\b.*\bcart\b/i.test(latestUserMessage) ||
    /\b(?:order|get|buy|want|need)\b/i.test(latestUserMessage) ||
    /\b(?:i.ll|could i|could you|can i|can you)\s+have\b/i.test(latestUserMessage) ||
    (
      /\badd\b/i.test(latestUserMessage) &&
      (
        /\bfrom\b/i.test(latestUserMessage) ||
        /\bmenu\b/i.test(latestUserMessage) ||
        normalize(latestUserMessage).split(" ").length >= 2
      )
    );

  const wordCount = normalize(latestUserMessage).split(" ").length;
  const isShortPhrase = wordCount >= 1 && wordCount <= 4 && !/\?/.test(latestUserMessage);
  const isGreeting = /^(?:hi|hello|hey|yo|sup|thanks|thank you|ty|ok|okay|k|bye|goodbye|good.?bye|gm|gn|good.?morning|good.?afternoon|good.?evening|what.?s up|howdy|namaste|hii+)$/i.test(latestUserMessage.trim());

  if (!wantsAddToCart || menu.length === 0) {
    if (isShortPhrase && menu.length > 0 && !isGreeting) {
      const candidateItem = fuzzyFindMenuItem(menu, normalize(latestUserMessage));
      if (candidateItem) {
        const shortQuantity = extractQuantity(latestUserMessage);
        const shortOutlet = canteenLink(candidateItem.canteenId);
        return {
          reply: `I can add ${shortQuantity === 1 ? candidateItem.name : `${shortQuantity} x ${candidateItem.name}`} from ${shortOutlet} to your cart for Rs.${candidateItem.price}${shortQuantity > 1 ? " each" : ""}. Reply with Confirm to continue or Cancel to keep things as they are.`,
          action: { type: "add_item_to_cart", payload: { itemId: candidateItem.id, quantity: shortQuantity } },
        };
      }
    }
    return null;
  }

  const isGenericAdd =
    /\b(?:any|random|some|whatever)\b/i.test(latestUserMessage) &&
    /\b(?:item|items|food|dish|dishes)\b/i.test(latestUserMessage);

  if (isGenericAdd) {
    const count = extractQuantity(latestUserMessage);
    const availableItems = menu.filter(
      (item) => item.isAvailable !== false && hasUsablePrice(item)
    );

    const outlets = [...new Set(availableItems.map((item) => item.canteenId).filter(Boolean))];
    if (outlets.length === 0) {
      return { reply: "There are no available items on the menu right now." };
    }

    const cartOutletId = orderContext?.cart?.outletId ?? null;
    const preferredOutlet = cartOutletId && outlets.includes(cartOutletId) ? cartOutletId : null;
    const chosenOutletId = preferredOutlet ?? outlets[Math.floor(Math.random() * outlets.length)];
    const outletItems = availableItems.filter((item) => item.canteenId === chosenOutletId);
    const shuffled = [...outletItems].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, count);

    if (chosen.length === 0) {
      return { reply: "There are no available items on the menu right now to suggest." };
    }

    const outletName = canteenLink(chosenOutletId);
    const items = chosen.map((item) => ({ itemId: item.id, quantity: 1 }));
    const itemNames = chosen
      .map((item) => `${item.name} from ${outletName} for Rs.${item.price}`)
      .join("\n");
    return {
      reply: `I can add these ${chosen.length} item(s) from ${outletName} to your cart:\n${itemNames}\n\nReply with Confirm to add them or Cancel to keep things as they are.`,
      action: { type: "add_item_to_cart", payload: { items } },
    };
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
    const fuzzyMatch = requestedItemPhrase ? fuzzyFindMenuItem(menu, requestedItemPhrase) : null;
    if (fuzzyMatch) {
      const fuzzyQuantity = extractQuantity(latestUserMessage);
      const fuzzyOutlet = canteenLink(fuzzyMatch.canteenId);
      const fuzzyCartOutletId = orderContext?.cart?.outletId ?? null;
      const fuzzyHasCart = Boolean(fuzzyCartOutletId);
      const fuzzyDiffOutlet = fuzzyHasCart && fuzzyCartOutletId !== fuzzyMatch.canteenId;
      if (fuzzyDiffOutlet) {
        const currentOutletName = canteenLink(fuzzyCartOutletId ?? "");
        const hasScheduleIntent = /\b(?:schedule|pre.?schedule|pre.?order|book|reserve|at\s+\d+\s*(?::\d+)?\s*(?:am|pm))\b/i.test(latestUserMessage);
        if (hasScheduleIntent) {
          return {
            reply: `I can clear your current cart (from ${currentOutletName}) and add ${fuzzyMatch.name} from ${fuzzyOutlet} instead so you can set up your pre-schedule. Reply with Confirm to proceed.`,
            action: { type: "add_item_to_cart", payload: { itemId: fuzzyMatch.id, quantity: fuzzyQuantity, clearCart: true } },
          };
        }
        return {
          reply: `I didn't add anything because your cart already has items from ${currentOutletName}. ByteHive only allows one outlet per cart, so you can either finish or clear that cart first, or ask me for something from ${currentOutletName}.`,
        };
      }
      return {
        reply: `I can add ${fuzzyQuantity === 1 ? fuzzyMatch.name : `${fuzzyQuantity} x ${fuzzyMatch.name}`} from ${fuzzyOutlet} to your cart for Rs.${fuzzyMatch.price}${fuzzyQuantity > 1 ? " each" : ""}. Reply with Confirm to continue or Cancel to keep things as they are.`,
        action: { type: "add_item_to_cart", payload: { itemId: fuzzyMatch.id, quantity: fuzzyQuantity } },
      };
    }
    const suggestions = buildNearbyMenuSuggestions(menu, latestUserMessage);
    return {
      reply: suggestions.length
        ? `I couldn't find that exact item on the current menu, so I didn't add anything. You can try one of these instead:\n- ${suggestions.join("\n- ")}`
        : "I couldn't find that exact item on the current menu, so I didn't add anything. Try asking with the exact menu item name or browse the menu list first.",
    };
  }

  const quantity = extractQuantity(latestUserMessage);
  const item = chosenMatch.item;
  const outletName = canteenLink(item.canteenId);
  const cartOutletId = orderContext?.cart?.outletId ?? null;
  const hasExistingCart = Boolean(cartOutletId);
  const isDifferentCartOutlet = hasExistingCart && cartOutletId !== item.canteenId;
  const quantityLabel = quantity === 1 ? item.name : `${quantity} x ${item.name}`;

  if (isDifferentCartOutlet) {
    const currentOutletName = canteenLink(cartOutletId ?? "");
    const hasScheduleIntent = /\b(?:schedule|pre.?schedule|pre.?order|book|reserve|at\s+\d+\s*(?::\d+)?\s*(?:am|pm))\b/i.test(latestUserMessage);
    if (hasScheduleIntent) {
      return {
        reply: `I can clear your current cart (from ${currentOutletName}) and add ${quantityLabel} from ${outletName} instead so you can set up your pre-schedule. Reply with Confirm to proceed.`,
        action: { type: "add_item_to_cart", payload: { itemId: item.id, quantity, clearCart: true } },
      };
    }
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

function maybeBuildStudentRemoveAction(
  latestUserMessage: string,
  orderContext: OrderContext | null
): StudentActionResponse | null {
  const wantsRemove =
    /\b(?:remove|delete|take\s*(?:out|off)|clear|empty)\b/i.test(latestUserMessage) &&
    (/\bcart\b/i.test(latestUserMessage) || (orderContext?.cart?.items?.length ?? 0) > 0);

  if (!wantsRemove) return null;

  const cartItems = orderContext?.cart?.items ?? [];
  if (cartItems.length === 0) {
    return { reply: "Your cart is already empty. Nothing to remove." };
  }

  const requestedItemPhrase = extractRequestedItemPhrase(latestUserMessage);

  const isClearIntent =
    /\b(?:clear|empty|all|everything|every\s+item|that|it|them)\b/i.test(latestUserMessage) &&
    (/\bcart\b/i.test(latestUserMessage) || !requestedItemPhrase || requestedItemPhrase.length < 3 || /^(?:all|all\s+things|everything|that|it|them)$/i.test(requestedItemPhrase));

  const isGenericRemoveItems =
    /\b(?:any|random|some)\b/i.test(latestUserMessage) &&
    /\b(?:item|items)\b/i.test(latestUserMessage);

  if (isGenericRemoveItems) {
    const count = extractQuantity(latestUserMessage);
    const shuffled = [...cartItems].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, Math.min(count, cartItems.length));
    if (chosen.length === 0) {
      return { reply: "Your cart is already empty." };
    }
    const chosenNames = chosen.map((item): string => item.name ?? "").filter(Boolean);
    return {
      reply: `Remove these ${chosen.length} item(s) from your cart?\n${chosenNames.join("\n")}\n\nReply with Confirm to remove them or Cancel to keep things as they are.`,
      action: { type: "remove_item_from_cart", payload: { itemNames: chosenNames } },
    };
  }

  if (!requestedItemPhrase || requestedItemPhrase.length < 3 || isClearIntent) {
    if (isClearIntent) {
      return {
        reply: `Remove all ${cartItems.length} item(s) from your cart? Reply with Confirm to clear your cart or Cancel to keep things as they are.`,
        action: { type: "remove_item_from_cart", payload: { itemName: "__all__" } },
      };
    }
    return { reply: "What would you like to remove from your cart? Try naming the item." };
  }

  const matchedCartItem = cartItems.find((item) => {
    if (!item.name) return false;
    const normalizedName = normalize(item.name);
    return (
      normalizedName === requestedItemPhrase ||
      normalizedName.includes(requestedItemPhrase) ||
      (requestedItemPhrase.length >= 3 &&
        levenshteinDistance(requestedItemPhrase, normalizedName) <= 2)
    );
  });

  if (!matchedCartItem) {
    const names = cartItems.map((i) => i.name).filter(Boolean);
    return {
      reply: `I couldn't find "${requestedItemPhrase}" in your cart. Your cart has: ${names.join(", ")}.`,
    };
  }

  return {
    reply: `Remove ${matchedCartItem.name} from your cart? Reply with Confirm to remove it or Cancel to keep it.`,
    action: { type: "remove_item_from_cart", payload: { itemName: matchedCartItem.name } },
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

function maybeBuildNavigationAction(latestUserMessage: string): StudentActionResponse | null {
  const msg = normalize(latestUserMessage);
  const isQuestion = /\b(?:where|what|how|which|why|when|who|tell\s+me|guide\s+me|instruct\s+me|explain|show\s+me\s+how)\b/i.test(msg);
  if (isQuestion) return null;
  const wantsNav = /\b(?:go|take|bring|redirect|send|show|open|navigate)\b/i.test(msg);
  if (!wantsNav) return null;

  const navTargets: Record<string, RegExp[]> = {
    "/": [/\bhome(?:page|screen)?\b/, /\bmain\s+page\b/, /\blanding\s+page\b/],
    "/cart": [/\bcart\b/, /\bshopping\s+cart\b/, /\bmy\s+items\b/, /\bpayment\b/, /\bcheckout\b/, /\bpay\b/, /\bbill\b/],
    "/canteens": [/\bcanteen(?:s)?\b/, /\boutlet(?:s)?\b/, /\bfood\s+court\b/, /\ball\s+(?:canteens|outlets)\b/],
    "/popular": [/\bpopular\b/, /\btrending\b/, /\btop\s+(?:items?|dishes?)\b/],
    "/about": [/\babout\s+(?:us|page)?\b/],
  };

  for (const [path, patterns] of Object.entries(navTargets)) {
    if (patterns.some((pattern) => pattern.test(msg))) {
      const labels: Record<string, string> = {
        "/": "homepage", "/cart": "cart page", "/canteens": "canteens page", "/popular": "popular items page", "/about": "about page",
      };
      return { reply: `Taking you to the ${labels[path] ?? path}...`, redirect: path };
    }
  }

  return null;
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

    const navigationAction = maybeBuildNavigationAction(latestUserMessage);
    if (navigationAction) {
      return NextResponse.json(navigationAction);
    }

    const studentRemoveAction = maybeBuildStudentRemoveAction(latestUserMessage, orderContext);
    if (studentRemoveAction) {
      return NextResponse.json(studentRemoveAction);
    }

    const studentAction = maybeBuildStudentAction(latestUserMessage, orderContext);
    const labelRecommendation = maybeBuildLabelRecommendation(latestUserMessage, orderContext);

    if (studentAction) {
      return NextResponse.json(studentAction);
    }

    if (labelRecommendation) {
      return NextResponse.json(labelRecommendation);
    }

    const lastChancePhrase = normalize(latestUserMessage);
    const lastChanceWordCount = lastChancePhrase.split(" ").length;
    const hasAddKeywords = /\b(?:add|order|get|buy|want|need|put)\b/i.test(latestUserMessage);
    const isGreetingMsg = /^(?:hi|hello|hey|yo|sup|thanks|thank you|ty|ok|okay|k|bye|goodbye|good.?bye|gm|gn|good.?morning|good.?afternoon|good.?evening|what.?s up|howdy|namaste|hii+)$/i.test(latestUserMessage.trim());
    const lastChanceItem = (
      hasAddKeywords ||
      (lastChanceWordCount >= 1 && lastChanceWordCount <= 5 && !isGreetingMsg)
    ) ? fuzzyFindMenuItem(menu, lastChancePhrase) : null;

    if (lastChanceItem) {
      const lastQuantity = extractQuantity(latestUserMessage);
      const lastOutlet = canteenLink(lastChanceItem.canteenId);
      return NextResponse.json({
        reply: `I can add ${lastQuantity === 1 ? lastChanceItem.name : `${lastQuantity} x ${lastChanceItem.name}`} from ${lastOutlet} to your cart for Rs.${lastChanceItem.price}${lastQuantity > 1 ? " each" : ""}. Reply with Confirm to continue or Cancel to keep things as they are.`,
        action: { type: "add_item_to_cart", payload: { itemId: lastChanceItem.id, quantity: lastQuantity } },
      });
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
- Use label metadata when the user asks for things like spicy food, served hot items, cold drinks, sweet items, dairy items, high-protein food, light bites, or egg-based dishes
- If the user asks for vegetarian food, only mention vegetarian items
- Use the current order context exactly as provided when answering order tracking, pickup, ETA, delay, or collection questions
- If there is no active order, clearly say that no live order was found instead of guessing
- If an order has a delay note, mention it when the user asks about timing or status
- If the user asks where to collect an order, answer with the pickup location from the order context
- If the user asks how long an order will take, use the estimated pickup value from the order context
- ByteHive supports pre-scheduling orders. Users can add items to their cart and then use the "Pre-Schedule" option in the cart page to set a desired pickup time. Guide users to add items first, then visit the cart page to schedule.
- If the user asks for a pickup code, only use the code from the order context
- Never claim an item was added to the cart, ordered, booked, or changed unless a structured chat action has already executed outside this prompt
- For cart-changing requests that are not already handled before this prompt, explain what is available but do not pretend the cart was updated. Do NOT say "your updated cart would be", "your cart now has", "I've added", or anything implying the cart changed — you can only describe what is currently in the cart from the context provided
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
