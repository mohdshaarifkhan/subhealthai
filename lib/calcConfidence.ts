export type RelPoint = { pred: number; obs: number; n: number };

export function confidenceFromCalibration(pred: number, rel: RelPoint[]) {
  if (!Number.isFinite(pred) || !rel?.length) return { level: "—", gap: null };

  let closest = rel[0];
  for (const point of rel) {
    if (Math.abs(point.pred - pred) < Math.abs(closest.pred - pred)) {
      closest = point;
    }
  }

  const gap = Math.abs(closest.pred - closest.obs);
  const level = gap < 0.05 ? "High" : gap < 0.1 ? "Medium" : "Low";

  return { level, gap: Number(gap.toFixed(3)) };
}
