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
