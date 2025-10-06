"use client";
import { useEffect, useState } from "react";
import RiskBadge from "../../components/RiskBadge";

type Row = { day: string; risk_score: number; model_version: string };

export default function RiskPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    fetch(`/api/risk?user=${userId}`).then(r => r.json()).then(setRows);
  }, [userId]);

  const latest = rows.at(-1);
  return (
    <div className="p-4 rounded-2xl shadow-sm border bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Predicted Risk</h3>
        {latest && <RiskBadge score={latest.risk_score} />}
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        {latest ? `Latest: ${latest.day} (${latest.model_version})` : "No risk data yet."}
      </div>
      {/* TODO: small line chart of risk over time */}
    </div>
  );
}
