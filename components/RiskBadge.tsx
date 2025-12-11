export default function RiskBadge({ score }: { score: number }) {
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
  