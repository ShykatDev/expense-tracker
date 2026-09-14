import {
  Activity,
  Banknote,
  CreditCard,
  Flame,
  Fuel,
  Gift,
  Home,
  Landmark,
  PiggyBank,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  createdAt: number;
}

export interface CategoryOption {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const EXPENSE_CATEGORIES: CategoryOption[] = [
  { key: "emi", label: "EMI", icon: Landmark },
  { key: "credit-card", label: "Credit Card Bill", icon: CreditCard },
  { key: "house-rent", label: "House Rent", icon: Home },
  { key: "grocery", label: "Grocery & Food", icon: ShoppingCart },
  { key: "wifi", label: "WiFi", icon: Wifi },
  { key: "electricity", label: "Electricity", icon: Zap },
  { key: "bike-fuel", label: "Bike Fuel", icon: Fuel },
  { key: "pocket-money", label: "Pocket Money", icon: Wallet },
];

export const INCOME_CATEGORIES: CategoryOption[] = [
  { key: "salary", label: "Salary", icon: Banknote },
  { key: "freelance", label: "Freelance", icon: Wallet },
  // { key: "business", label: "Business", icon: Building2 },
  { key: "investment", label: "Investment", icon: TrendingUp },
  { key: "gift", label: "Gift", icon: Gift },
];

export const OTHER_CATEGORY_LABEL = "Other";

export const CATEGORY_VISIBILITY_STORAGE_KEY =
  "expense-tracker:hidden-categories";

export function getCategoryIcon(
  type: TransactionType,
  category: string,
): LucideIcon {
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.label === category)?.icon ?? Receipt;
}

export const STORAGE_KEY = "expense-tracker:transactions";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactNumber(amount: number) {
  const abs = Math.abs(amount);
  const format = (divisor: number, suffix: string) =>
    `${Number((amount / divisor).toFixed(1))}${suffix}`;

  if (abs >= 1_000_000) return format(1_000_000, "m");
  if (abs >= 1_000) return format(1_000, "k");
  return `${amount}`;
}

export function computeTotals(transactions: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function computeCategoryTotals(transactions: Transaction[]) {
  const map = new Map<
    string,
    { category: string; type: TransactionType; total: number }
  >();
  for (const t of transactions) {
    const key = `${t.type}:${t.category}`;
    const existing = map.get(key);
    if (existing) existing.total += t.amount;
    else map.set(key, { category: t.category, type: t.type, total: t.amount });
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export type SpendingInsight = {
  label: string;
  icon: LucideIcon;
  tone: "positive" | "warning" | "neutral";
};

export function getSpendingInsight(
  income: number,
  expense: number,
): SpendingInsight | null {
  if (income === 0 && expense === 0) return null;

  if (expense > income) {
    return { label: "Expenses high", icon: Flame, tone: "warning" };
  }

  const ratio = income > 0 ? expense / income : 0;
  if (ratio <= 0.5) {
    return { label: "Great savings", icon: PiggyBank, tone: "positive" };
  }

  return { label: "On track", icon: Activity, tone: "neutral" };
}

export interface TransactionGroup {
  label: string;
  items: Transaction[];
}

export function groupTransactionsByDay(
  transactions: Transaction[],
): TransactionGroup[] {
  const sorted = [...transactions].sort((a, b) => b.createdAt - a.createdAt);
  const groups = new Map<string, Transaction[]>();

  for (const t of sorted) {
    const key = new Date(t.createdAt).toDateString();
    const list = groups.get(key);
    if (list) list.push(t);
    else groups.set(key, [t]);
  }

  const todayKey = new Date().toDateString();
  const yesterdayKey = new Date(Date.now() - 86_400_000).toDateString();

  return Array.from(groups.entries()).map(([key, items]) => {
    if (key === todayKey) return { label: "Today", items };
    if (key === yesterdayKey) return { label: "Yesterday", items };
    return {
      label: new Date(items[0].createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      items,
    };
  });
}

export type DateRangeFilter = "today" | "week" | "month" | "all";

export function isWithinDateRange(
  createdAt: number,
  filter: DateRangeFilter,
  monthAnchor: Date,
) {
  if (filter === "all") return true;

  const date = new Date(createdAt);
  const now = new Date();

  if (filter === "today") {
    return date.toDateString() === now.toDateString();
  }

  if (filter === "week") {
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);
    return date >= weekStart && date <= now;
  }

  return (
    date.getFullYear() === monthAnchor.getFullYear() &&
    date.getMonth() === monthAnchor.getMonth()
  );
}
