import {
  DEFAULT_CATEGORY_ICON,
  getCategoryIconByKey,
} from "@/lib/category-icons";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type CustomCategory,
  type ResolvedCategory,
  type TransactionType,
} from "@/lib/transactions";

/** Built-in category key -> icon registry key. */
export const BUILTIN_ICON_KEYS: Record<string, string> = {
  emi: "landmark",
  "credit-card": "credit-card",
  "house-rent": "home",
  grocery: "shopping-cart",
  wifi: "wifi",
  electricity: "zap",
  "bike-fuel": "fuel",
  "pocket-money": "wallet",
  salary: "banknote",
  freelance: "wallet",
  investment: "trending-up",
  gift: "gift",
};

export function getBuiltinCategories(type: TransactionType) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

/**
 * Merge built-in and custom categories into one normalized list, so the
 * drawers, the categories page and the icon lookup all work off the same
 * shape.
 */
export function resolveCategories(
  type: TransactionType,
  customCategories: CustomCategory[] = [],
): ResolvedCategory[] {
  const builtin: ResolvedCategory[] = getBuiltinCategories(type).map(
    (category) => {
      const iconKey = BUILTIN_ICON_KEYS[category.key] ?? DEFAULT_CATEGORY_ICON;
      return {
        key: category.key,
        label: category.label,
        icon: getCategoryIconByKey(iconKey),
        iconKey,
        source: "builtin" as const,
      };
    },
  );

  const custom: ResolvedCategory[] = customCategories
    .filter((category) => category.type === type)
    .map((category) => ({
      key: category.key,
      label: category.label,
      icon: getCategoryIconByKey(category.iconKey),
      iconKey: category.iconKey,
      source: "custom" as const,
      id: category.id,
    }));

  return [...builtin, ...custom];
}

/**
 * Look a category up by its immutable key. Built-in keys are matched first,
 * then custom ones. Targets store the key rather than the label so that a
 * rename keeps the target pointed at the same category.
 */
export function findCategoryByKey(
  key: string,
  customCategories: CustomCategory[] = [],
): ResolvedCategory | undefined {
  for (const type of ["expense", "income"] as const) {
    const builtin = resolveCategories(type, customCategories).find(
      (category) => category.key === key,
    );
    if (builtin) return builtin;
  }
  return undefined;
}

/**
 * Resolve the icon for a transaction. Transactions store the category as a
 * label string, so the custom categories have to be consulted at lookup time.
 */
export function resolveCategoryIcon(
  type: TransactionType,
  category: string,
  customCategories: CustomCategory[] = [],
) {
  const builtin = getBuiltinCategories(type).find(
    (option) => option.label === category,
  );
  if (builtin) return builtin.icon;

  const custom = customCategories.find(
    (option) => option.type === type && option.label === category,
  );
  if (custom) return getCategoryIconByKey(custom.iconKey);

  return getCategoryIconByKey(DEFAULT_CATEGORY_ICON);
}
