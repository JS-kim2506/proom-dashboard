"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { GROUPS } from "@/lib/keywords";
import type { DailyStats } from "@/lib/types";

interface Props {
  stats: DailyStats[];
}

export default function TrendChart({ stats }: Props) {
  if (stats.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-6 text-center text-sm text-gray-400 dark:text-slate-500">
        차트 데이터가 아직 없습니다.
      </div>
    );
  }

  const chartData = stats.map((s) => ({
    date: s.date.slice(5),
    ...GROUPS.reduce(
      (acc, g) => ({ ...acc, [g.name]: s.byGroup[g.id] || 0 }),
      {} as Record<string, number>
    ),
  }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">📈 언급량 추이</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          <XAxis 
            dataKey="date" 
            fontSize={11} 
            stroke="var(--muted)" 
            interval="preserveStartEnd" // 데이터가 많아질 때 레이블 자동 조절
            minTickGap={20}
          />
          <YAxis fontSize={11} stroke="var(--muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              color: "var(--foreground)",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {GROUPS.map((group) => (
            <Line
              key={group.id}
              type="monotone"
              dataKey={group.name}
              stroke={group.color}
              strokeWidth={2}
              dot={stats.length > 30 ? false : { r: 2 }} // 30일 넘으면 점 생략하여 가독성 확보
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
