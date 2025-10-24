"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function RiskSpark({ data }: { data: { day:string; risk_score:number }[] }) {
  return (
    <div className="h-24 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="day" hide />
          <YAxis domain={[0,1]} hide />
          <Tooltip />
          <Line type="monotone" dataKey="risk_score" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
