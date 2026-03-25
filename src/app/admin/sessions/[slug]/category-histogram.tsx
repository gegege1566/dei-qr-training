"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CategoryData = {
  category: string;
  count: number;
  avg: number;
  buckets: number[];
};

type Props = {
  categories: CategoryData[];
  bucketLabels: string[];
};

const BAR_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6"];

export function CategoryHistogram({ categories, bucketLabels }: Props) {
  const [selected, setSelected] = useState<string | null>(
    categories.length > 0 ? categories[0].category : null
  );

  if (categories.length === 0) {
    return null;
  }

  const current = categories.find((c) => c.category === selected);
  const chartData = current
    ? bucketLabels.map((label, i) => ({
        range: label,
        count: current.buckets[i],
      }))
    : [];

  return (
    <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
      <CardHeader>
        <CardTitle className="text-xl text-white">中分類別 スコア分布</CardTitle>
        <p className="text-sm text-slate-400">全回答者のスコア分布（1問あたり30点満点）</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category selector */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.category}
              onClick={() => setSelected(c.category)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                selected === c.category
                  ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40"
                  : "bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
              )}
            >
              {c.category}
              <span className="ml-1 text-slate-500">({c.count})</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        {current && (
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-slate-500">回答数: </span>
              <span className="font-semibold text-white">{current.count}</span>
            </div>
            <div>
              <span className="text-slate-500">平均スコア: </span>
              <span className="font-semibold text-white">{current.avg}</span>
              <span className="text-slate-500">/30</span>
            </div>
          </div>
        )}

        {/* Histogram */}
        {current && (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                  }}
                  formatter={(value: unknown) => [`${value}人`, "回答数"]}
                  labelFormatter={(label: unknown) => `スコア: ${label}点`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
