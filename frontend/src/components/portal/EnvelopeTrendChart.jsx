import React from "react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";

/**
 * Recharts area chart for the dashboard/reports trend.
 * Isolated in its own module so it is code-split into the recharts chunk
 * (~97 KB gzip) and lazy-loaded — the dashboard shell paints before this
 * downloads. Default export so React.lazy() can consume it directly.
 */
export default function EnvelopeTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E1DDD1", fontSize: 12 }} />
        <Area type="monotone" dataKey="count" stroke="#14B8A6" strokeWidth={2} fill="url(#g)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
