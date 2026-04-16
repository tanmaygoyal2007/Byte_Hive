export type CustomLabel = {
  name: string;
  color: string;
};

export function getLabelColorsForCanteen(canteenId: string | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!canteenId || typeof window === "undefined") return map;

  try {
    const stored = localStorage.getItem("bytehive-vendor-labels");
    if (!stored) return map;

    const all = JSON.parse(stored) as Record<string, CustomLabel[]>;
    const labels = all[canteenId];
    
    if (labels && Array.isArray(labels)) {
      labels.forEach((label) => {
        map[label.name.toLowerCase()] = label.color;
      });
    }
  } catch {}

  return map;
}
