type ShapItem = { feature: string; shap_value: number };
type SnapshotItem = {
  unit: string;
  today: number | null;
  baseline: number | null;
  delta: number | null;
  z: number | null;
};

type Snapshot = {
  items: Record<string, SnapshotItem>;
};

export function joinShapWithSnapshot(shapTop4: ShapItem[], snap: Snapshot) {
  return shapTop4.map((s) => {
    const ctx = snap.items[s.feature] ?? {
      unit: "",
      today: null,
      baseline: null,
      delta: null,
      z: null,
    };

    return {
      feature: s.feature,
      shap: s.shap_value,
      ...ctx,
    };
  });
}


