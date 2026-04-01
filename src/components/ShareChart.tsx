"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { GROUPS } from "@/lib/keywords";

interface Props {
  byGroup: Record<string, number>;
}

export default function ShareChart({ byGroup }: Props) {
  const data = GROUPS.map((g) => ({
    name: g.name,
    value: byGroup[g.id] || 0,
    color: g.color,
  })).filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-6 text-center text-xs text-gray-400 dark:text-slate-500 h-[260px] flex items-center justify-center">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">📊 점유율 (Share of Voice)</h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "var(--card-bg)", 
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              fontSize: "12px"
            }} 
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
