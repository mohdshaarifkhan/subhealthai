type Inputs = {
  wearableRisk: number | null;    // 0..1
  labRisk: number | null;         // 0..1
  lifestyleScore: number | null;  // 0..1 (higher worse)
  geneticPrior: number | null;    // 0..1
  familyPrior: number | null;     // 0..1
};

const w = { wearable: 0.42, lab: 0.28, lifestyle: 0.12, genetic: 0.10, family: 0.08 };

export function fuseRisk(i: Inputs) {
  const safe = (x: number | null, def=0)=> (x==null? def : x);

  const r =
    w.wearable * safe(i.wearableRisk) +
    w.lab      * safe(i.labRisk) +
    w.lifestyle* safe(i.lifestyleScore) +
    w.genetic  * safe(i.geneticPrior) +
    w.family   * safe(i.familyPrior);

  return Math.min(1, Math.max(0, r));
}

