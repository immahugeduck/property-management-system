"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface RevenueByPropertyChartProps {
  data: { name: string; collected: number; pending: number }[]
}

function formatCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value}`
}

export function RevenueByPropertyChart({ data }: RevenueByPropertyChartProps) {
  const topData = data.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue by Property</CardTitle>
        <CardDescription>Collected and pending per property (all-time)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "collected" ? "Collected" : "Pending"]}
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
            />
            <Bar dataKey="collected" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} stackId="a" />
            <Bar dataKey="pending" fill="var(--chart-4)" radius={[0, 4, 4, 0]} maxBarSize={20} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
