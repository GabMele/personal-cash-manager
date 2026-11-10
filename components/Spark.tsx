"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Pt { label: string; v: number }

/** Grafico ad area. `big` = con assi e tooltip (riepilogo); altrimenti sparkline compatta. */
export default function Spark({ data, color, big, fmt }: { data: Pt[]; color: string; big?: boolean; fmt: (n: number) => string }) {
  const id = `g${color.replace("#", "")}${big ? "b" : "s"}`;
  return (
    <ResponsiveContainer>
      <AreaChart data={data} margin={big ? { top: 6, right: 4, left: 0, bottom: 0 } : { top: 4, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.55} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {big && <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />}
        {big && <XAxis dataKey="label" stroke="#9a9ab5" fontSize={11} tickLine={false} axisLine={false} />}
        <YAxis hide={!big} stroke="#9a9ab5" fontSize={11} width={big ? 52 : undefined} tickLine={false} axisLine={false} domain={["dataMin", "dataMax"]} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
        {big && <Tooltip contentStyle={{ background: "#14142a", border: "1px solid #333", borderRadius: 12 }} formatter={(v) => fmt(Number(v))} />}
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2.2} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
