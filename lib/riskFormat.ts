export function toPct(p?: number) {
  if (p == null) return "—";
  return `${Math.round(p * 100)}%`;
}

export function riskColor(p?: number) {
  if (p == null) return "bg-gray-200 text-gray-700";
  if (p <= 0.2) return "bg-green-100 text-green-800";
  if (p <= 0.5) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}


