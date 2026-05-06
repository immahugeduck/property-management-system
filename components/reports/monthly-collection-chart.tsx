"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface MonthlyCollectionChartProps {
  data: { month: string; collected: number; expected: number; rate: number }[]
}

function formatCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value}`
}

export function MonthlyCollectionChart({ data }: MonthlyCollectionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Collections</CardTitle>
        <CardDescription>Collected vs. expected rent over 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "collected" ? "Collected" : "Expected"]}
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
            />
            <Legend formatter={(v) => v === "collected" ? "Collected" : "Expected"} wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="expected" fill="var(--muted)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="collected" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
