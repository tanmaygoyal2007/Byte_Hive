export function formatCurrency(value: number) {
  return `Rs ${Math.round(value * 100) / 100}`;
}
