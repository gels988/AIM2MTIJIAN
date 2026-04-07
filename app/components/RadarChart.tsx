"use client";

import { clsx } from "clsx";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function RadarChart({
  data,
  className,
}: {
  data: { dimension: string; score: number }[];
  className?: string;
}) {
  return (
    <div className={clsx("w-full", className ?? "h-[240px]")}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(229,231,235,0.12)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "rgba(229,231,235,0.8)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "rgba(229,231,235,0.45)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(229,231,235,0.12)" }}
          />
          <Tooltip
            cursor={{ stroke: "rgba(251,191,36,0.35)" }}
            contentStyle={{
              background: "rgba(10,10,14,0.92)",
              border: "1px solid rgba(251,191,36,0.35)",
              borderRadius: 12,
              color: "rgba(229,231,235,0.9)",
            }}
            labelStyle={{ color: "rgba(229,231,235,0.85)" }}
            itemStyle={{ color: "rgba(251,191,36,0.95)" }}
          />
          <Radar
            dataKey="score"
            stroke="#fbbf24"
            fill="rgba(251,191,36,0.22)"
            fillOpacity={1}
            strokeWidth={2}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
