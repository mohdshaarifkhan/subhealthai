"use client";

import { useMemo } from "react";

type Point = { value: number | null; day?: string }; 

type Props = {
  points: Point[];
  width?: number;
  height?: number;
  color?: string;
  baseline?: number | null;
};

export function Sparkline({
  points,
  width = 120,
  height = 28,
  color = "#6b7280",
  baseline = null,
}: Props) {
  const { path, hasData, min, max } = useMemo(() => {
    const values = points.map((p) => p.value).filter((v): v is number => v != null);
    if (!values.length) {
      return { path: "", hasData: false, min: 0, max: 0 };
    }

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const step = width / Math.max(1, points.length - 1);
    const pad = 1;
    const usableHeight = height - pad * 2;

    const norm = (value: number) => {
      if (maxVal === minVal) return 0.5;
      return (value - minVal) / (maxVal - minVal);
    };

    const segments = points
      .map((point, index) => {
        if (point.value == null) return null;
        const x = index * step + pad;
        const y = (1 - norm(point.value)) * usableHeight + pad;
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .filter(Boolean)
      .join(" ");

    return { path: segments, hasData: true, min: minVal, max: maxVal };
  }, [points, width, height]);

  if (!hasData) {
    return <div style={{ width, height }} className="rounded bg-gray-100" />;
  }

  const pad = 1;
  const baselineY = baseline != null && max !== min
    ? (1 - (baseline - min) / (max - min)) * (height - pad * 2) + pad
    : null;

  return (
    <svg
      width={width}
      height={height}
      className="text-gray-400"
      role="img"
    >
      <defs>
        <clipPath id="sparkline-clip">
          <rect x={0} y={0} width={width} height={height} rx={2} ry={2} />
        </clipPath>
      </defs>
      <g clipPath="url(#sparkline-clip)">
        {baselineY != null && baselineY >= 0 && baselineY <= height ? (
          <line
            x1={0}
            x2={width}
            y1={baselineY}
            y2={baselineY}
            stroke="#e5e7eb"
            strokeDasharray="2 2"
            strokeWidth={1}
          />
        ) : null}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </g>
    </svg>
  );
}


