export type CustomLabel = {
  id?: string;
  name: string;
  color: string;
  description?: string;
};

export type FoodLabelDefinition = {
  id: string;
  name: string;
  color: string;
  description: string;
  kind: "system" | "custom";
};

type LabelAwareMenuItem = {
  name: string;
  category?: string;
  description?: string;
  isVeg?: boolean;
  labels?: string[];
};

const LABEL_STORAGE_KEY = "bytehive-vendor-labels";

const SYSTEM_LABELS: FoodLabelDefinition[] = [
  { id: "spicy", name: "Spicy", color: "#ef4444", description: "Bold heat or masala-forward flavor.", kind: "system" },
  { id: "contains-dairy", name: "Contains Dairy", color: "#3b82f6", description: "Made with milk, paneer, butter, cheese, or cream.", kind: "system" },
  { id: "served-cold", name: "Served Cold", color: "#06b6d4", description: "Best enjoyed chilled or iced.", kind: "system" },
  { id: "served-hot", name: "Served Hot", color: "#f97316", description: "Prepared for a warm, fresh serving.", kind: "system" },
  { id: "sweet", name: "Sweet", color: "#ec4899", description: "Dessert-style or noticeably sweet.", kind: "system" },
  { id: "egg-based", name: "Egg-based", color: "#facc15", description: "Contains egg or omelette-style preparation.", kind: "system" },
  { id: "high-protein", name: "High Protein", color: "#22c55e", description: "More filling, protein-leaning option.", kind: "system" },
  { id: "light-bite", name: "Light Bite", color: "#8b5cf6", description: "Smaller or snack-friendly portion.", kind: "system" },
];

const dairyKeywords = ["paneer", "cheese", "butter", "cream", "milk", "lassi", "shake", "kulfi", "ice cream", "coffee"];
const coldKeywords = ["cold", "iced", "ice cream", "kulfi", "shake", "lassi", "falooda", "smoothie", "float"];
const hotKeywords = ["coffee", "tea", "dosa", "paratha", "naan", "kulcha", "pizza", "omelette", "roll", "burger", "bhaji", "soup"];
const spicyKeywords = ["spicy", "masala", "chilli", "chili", "schezwan", "tikka", "chole", "amritsari", "manchurian", "peri peri"];
const sweetKeywords = ["sweet", "dessert", "ice cream", "shake", "cake", "brownie", "cookie", "waffle", "falooda", "kulfi"];
const eggKeywords = ["egg", "omelette", "omelet"];
const proteinKeywords = ["paneer", "chicken", "egg", "omelette", "nutri", "protein", "soy", "dal", "rajma", "chole"];
const lightBiteKeywords = ["snack", "fries", "roll", "sandwich", "toast", "coffee", "tea", "shake", "cookie", "momos"];

function normalizeLabelName(value: string) {
  return value.trim().toLowerCase();
}

function titleCaseWords(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSearchableText(item: LabelAwareMenuItem) {
  return [item.name, item.category ?? "", item.description ?? ""].join(" ").toLowerCase();
}

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function dedupeLabels(labels: string[]) {
  const seen = new Set<string>();
  return labels.filter((label) => {
    const key = normalizeLabelName(label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toDefinitionMap(labels: FoodLabelDefinition[]) {
  return labels.reduce<Record<string, FoodLabelDefinition>>((acc, label) => {
    acc[normalizeLabelName(label.name)] = label;
    return acc;
  }, {});
}

function readAllCustomLabels() {
  if (typeof window === "undefined") return {} as Record<string, CustomLabel[]>;

  try {
    const stored = localStorage.getItem(LABEL_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Record<string, CustomLabel[]>;
  } catch {
    return {};
  }
}

function writeAllCustomLabels(value: Record<string, CustomLabel[]>) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LABEL_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore local persistence errors in UI-only label helpers
  }
}

export function getSystemFoodLabels() {
  return SYSTEM_LABELS;
}

export function getStoredCustomLabelsForCanteen(canteenId: string | undefined) {
  if (!canteenId) return [];

  const rawLabels = readAllCustomLabels()[canteenId] ?? [];
  return rawLabels.map((label) => ({
    id: label.id ?? normalizeLabelName(label.name).replace(/\s+/g, "-"),
    name: titleCaseWords(label.name),
    color: label.color,
    description: label.description?.trim() || "Custom food label.",
  }));
}

export function saveStoredCustomLabelsForCanteen(canteenId: string | undefined, labels: CustomLabel[]) {
  if (!canteenId) return;

  const allLabels = readAllCustomLabels();
  allLabels[canteenId] = labels.map((label) => ({
    id: label.id ?? normalizeLabelName(label.name).replace(/\s+/g, "-"),
    name: titleCaseWords(label.name),
    color: label.color,
    description: label.description?.trim() || "Custom food label.",
  }));
  writeAllCustomLabels(allLabels);
}

export function getAllFoodLabelsForCanteen(canteenId: string | undefined): FoodLabelDefinition[] {
  const customLabels = getStoredCustomLabelsForCanteen(canteenId).map<FoodLabelDefinition>((label) => ({
    id: label.id ?? normalizeLabelName(label.name).replace(/\s+/g, "-"),
    name: titleCaseWords(label.name),
    color: label.color,
    description: label.description?.trim() || "Custom food label.",
    kind: "custom",
  }));

  return [...SYSTEM_LABELS, ...customLabels];
}

export function getLabelColorsForCanteen(canteenId: string | undefined): Record<string, string> {
  return getAllFoodLabelsForCanteen(canteenId).reduce<Record<string, string>>((acc, label) => {
    acc[normalizeLabelName(label.name)] = label.color;
    return acc;
  }, {});
}

export function getFoodLabelDefinition(labelName: string, canteenId?: string) {
  const definitions = toDefinitionMap(getAllFoodLabelsForCanteen(canteenId));
  return definitions[normalizeLabelName(labelName)] ?? null;
}

export function deriveSystemLabelNames(item: LabelAwareMenuItem) {
  const text = getSearchableText(item);
  const derived: string[] = [];

  if (hasKeyword(text, spicyKeywords)) derived.push("Spicy");
  if (hasKeyword(text, dairyKeywords)) derived.push("Contains Dairy");
  if (hasKeyword(text, coldKeywords)) derived.push("Served Cold");
  if (!hasKeyword(text, coldKeywords) && (hasKeyword(text, hotKeywords) || !/beverage|dessert/i.test(item.category ?? ""))) {
    derived.push("Served Hot");
  }
  if (hasKeyword(text, sweetKeywords) || /dessert/i.test(item.category ?? "")) derived.push("Sweet");
  if (hasKeyword(text, eggKeywords)) derived.push("Egg-based");
  if (hasKeyword(text, proteinKeywords) || item.isVeg === false) derived.push("High Protein");
  if (hasKeyword(text, lightBiteKeywords) || /snack|beverage/i.test(item.category ?? "")) derived.push("Light Bite");

  return dedupeLabels(derived);
}

export function getDisplayLabelsForItem(item: LabelAwareMenuItem, canteenId?: string) {
  const explicitLabels = item.labels ?? [];
  const combined = dedupeLabels([...deriveSystemLabelNames(item), ...explicitLabels]);
  const definitions = toDefinitionMap(getAllFoodLabelsForCanteen(canteenId));

  return combined.map((label) => {
    const resolved = definitions[normalizeLabelName(label)];
    if (resolved) return resolved;

    return {
      id: normalizeLabelName(label).replace(/\s+/g, "-"),
      name: titleCaseWords(label),
      color: "#c084fc",
      description: "Custom item label.",
      kind: "custom" as const,
    };
  });
}

export function itemMatchesAllSelectedLabels(item: LabelAwareMenuItem, selectedLabels: string[], canteenId?: string) {
  if (selectedLabels.length === 0) return true;
  const itemLabels = new Set(getDisplayLabelsForItem(item, canteenId).map((label) => normalizeLabelName(label.name)));
  return selectedLabels.every((label) => itemLabels.has(normalizeLabelName(label)));
}
