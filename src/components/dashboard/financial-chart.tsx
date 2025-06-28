"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis } from "recharts"
import type { ChartData } from "@/types"

interface FinancialChartProps {
  data: ChartData[]
}

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(142, 76%, 36%)",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(0, 84%, 60%)",
  },
  profit: {
    label: "Profit",
    color: "hsl(221, 83%, 53%)",
  },
}

export function FinancialChart({ data }: FinancialChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Trends</CardTitle>
        <CardDescription>Income, expenses, and profit over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px]">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tickFormatter={(value) => `$${value}`} axisLine={false} tickLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  formatter={(value, name) => [
                    `$${Number(value).toLocaleString()}`,
                    chartConfig[name as keyof typeof chartConfig]?.label || name,
                  ]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="income"
              stackId="1"
              stroke={chartConfig.income.color}
              fill={chartConfig.income.color}
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stackId="2"
              stroke={chartConfig.expenses.color}
              fill={chartConfig.expenses.color}
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="profit"
              stackId="3"
              stroke={chartConfig.profit.color}
              fill={chartConfig.profit.color}
              fillOpacity={0.6}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
