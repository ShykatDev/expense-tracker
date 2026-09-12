"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/transactions";

export function StatCards({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const stats = [
    {
      label: "Income",
      value: income,
      icon: ArrowUpRight,
      prefix: "+",
    },
    {
      label: "Expenses",
      value: expense,
      icon: ArrowDownRight,
      prefix: "−",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <Card
          key={stat.label}
          className="animate-in fade-in slide-in-from-bottom-2 gap-3 py-5 duration-500 fill-mode-both"
          style={{ animationDelay: `${index * 75}ms` }}
        >
          <CardHeader className="flex flex-row items-center justify-between px-5">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {stat.label}
            </CardTitle>
            <stat.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {stat.prefix}
              {formatCurrency(stat.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
