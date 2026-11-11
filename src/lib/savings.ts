/**
 * Savings is derived from the transaction ledger, never stored separately.
 *
 * Everything that comes in (income) minus everything that goes out (expense)
 * is the money the user has set aside. Keeping it derived means the savings
 * figure can never drift away from the transactions that produced it, and
 * there is no second ledger to keep in sync.
 */
import { computeTotals, type Transaction } from "@/lib/transactions";

/**
 * Total money set aside so far.
 *
 * Negative when expenses exceed income — spending more than you earn is
 * shown honestly rather than clamped to zero.
 */
export function computeSavings(transactions: Transaction[]) {
  return computeTotals(transactions).balance;
}

export type SavingsTone = "great" | "good" | "tight" | "over" | "neutral";

export interface SavingsVerdict {
  tone: SavingsTone;
  /** A short headline, e.g. "Excellent saver". */
  title: string;
  /** One sentence of supporting detail. */
  detail: string;
}

/**
 * Turns a month's income and expense into a plain-language verdict.
 *
 * The bands follow the common rule of thumb that saving 20% or more of
 * income is healthy, and they compare against last month when there is one
 * so the verdict also says which way things are heading.
 */
export function getSavingsVerdict({
  income,
  expense,
  previousSavings,
}: {
  income: number;
  expense: number;
  /** Last month's savings, or null when there is nothing to compare. */
  previousSavings: number | null;
}): SavingsVerdict {
  const savings = income - expense;

  if (income === 0 && expense === 0) {
    return {
      tone: "neutral",
      title: "Nothing logged yet",
      detail: "Add your income and spending to see how you're doing.",
    };
  }

  if (income === 0) {
    return {
      tone: "over",
      title: "No income logged",
      detail: "You're spending this month without any income recorded.",
    };
  }

  const rate = Math.round((savings / income) * 100);

  let trend = "";
  if (previousSavings !== null && previousSavings !== 0) {
    const change = Math.round(((savings - previousSavings) / Math.abs(previousSavings)) * 100);
    if (change >= 5) trend = ` That's ${change}% better than last month.`;
    else if (change <= -5) trend = ` That's ${Math.abs(change)}% down on last month.`;
  }

  if (savings < 0) {
    return {
      tone: "over",
      title: "Overspending",
      detail: `You've spent ${Math.abs(rate)}% more than you earned.${trend}`,
    };
  }
  if (rate >= 30) {
    return {
      tone: "great",
      title: "Excellent saver",
      detail: `You're keeping ${rate}% of your income.${trend}`,
    };
  }
  if (rate >= 20) {
    return {
      tone: "good",
      title: "On track",
      detail: `${rate}% of your income saved — right where it should be.${trend}`,
    };
  }
  if (rate >= 5) {
    return {
      tone: "tight",
      title: "A little tight",
      detail: `Only ${rate}% saved. Aim for 20% by trimming a category or two.${trend}`,
    };
  }
  return {
    tone: "tight",
    title: "Breaking even",
    detail: `Almost everything you earn is going out.${trend}`,
  };
}
