"use client"

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatCompactNumber, formatCurrency } from "@/lib/transactions"

const chartConfig = {
  total: { label: "Amount" },
  income: { label: "Income", color: "var(--chart-1)" },
  expense: { label: "Expense", color: "var(--chart-4)" },
} satisfies ChartConfig

export function OverviewChart({
  data,
}: {
  data: { category: string; type: "income" | "expense"; total: number }[]
}) {
  const hasData = data.length > 0

  const chartData = data.map((entry) => ({
    ...entry,
    label: entry.type === "income" ? "Income" : "Expense",
  }))

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-foreground">Statistics</p>
        <p className="text-xs text-muted-foreground">
          Amount by category, income vs. expenses
        </p>
      </div>
      {hasData ? (
        <>
          <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={40}
                tickFormatter={(value) => formatCompactNumber(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground capitalize">
                          {item.payload.category}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatCurrency(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={600}>
                {chartData.map((entry) => (
                  <Cell
                    key={`${entry.type}-${entry.category}`}
                    fill={
                      entry.type === "income"
                        ? "var(--color-income)"
                        : "var(--color-expense)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: "var(--chart-1)" }}
              />
              <span className="text-xs text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: "var(--chart-4)" }}
              />
              <span className="text-xs text-muted-foreground">Expense</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-muted-foreground">
          Add an income or expense to see your statistics
        </div>
      )}
    </div>
  )
}
