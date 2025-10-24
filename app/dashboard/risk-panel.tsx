"use client";
import { useEffect, useState } from "react";
import RiskSpark from "../../components/RiskSpark";
import ExplainModal from "../../components/ExplainModal";

type Row = { day: string; risk_score: number; model_version: string };

function RiskBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let color = "bg-green-600";
  if (score >= 0.33 && score < 0.66) color = "bg-yellow-600";
  if (score >= 0.66) color = "bg-red-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white ${color}`}>
      Risk {pct}%
    </span>
  );
}

export default function RiskPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/risk?user=${userId}`).then(r => r.json()).then(setRows).catch(() => setRows([]));
  }, [userId]);

  const latest = rows.at(-1);

  return (
    <div className="p-4 rounded-2xl shadow-sm border bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Predicted Risk</h3>
        {latest && <RiskBadge score={latest.risk_score} />}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {latest ? `Latest: ${latest.day} (${latest.model_version})` : "No risk data yet."}
      </div>

      {rows.length > 1 && <RiskSpark data={rows} />}

      <div className="mt-4">
        <button
          onClick={() => setOpen(true)}
          className="text-sm rounded-lg px-3 py-2 border hover:bg-accent"
        >
          Why this score?
        </button>
      </div>

      <ExplainModal userId={userId} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
