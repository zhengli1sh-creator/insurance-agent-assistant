"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function InsightsChart({ data }: { data: Array<{ name: string; 客户数: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D9E2EC" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
        <Tooltip cursor={{ fill: "rgba(30,58,138,0.08)" }} />
        <Bar dataKey="客户数" radius={[12, 12, 0, 0]} fill="#1E3A8A" />
      </BarChart>
    </ResponsiveContainer>
  );
}
