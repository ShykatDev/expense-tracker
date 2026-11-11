import {
  Baby,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  Camera,
  Car,
  Coffee,
  CreditCard,
  Dog,
  Droplets,
  Dumbbell,
  Film,
  Flower2,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Landmark,
  Music,
  PawPrint,
  Phone,
  PiggyBank,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Ticket,
  Train,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons are persisted as string keys (icon components are not JSON
 * serializable), so every selectable icon needs a stable key here.
 *
 * The first block mirrors the built-in category keys so a built-in and a
 * custom category can share the same icon without a lookup table.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Built-in category icons.
  landmark: Landmark,
  "credit-card": CreditCard,
  home: Home,
  "shopping-cart": ShoppingCart,
  wifi: Wifi,
  zap: Zap,
  fuel: Fuel,
  wallet: Wallet,
  banknote: Banknote,
  "trending-up": TrendingUp,
  gift: Gift,
  receipt: Receipt,

  // Additional picker choices.
  car: Car,
  plane: Plane,
  train: Train,
  bus: Bus,
  bike: Bike,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  coffee: Coffee,
  "book-open": BookOpen,
  "paw-print": PawPrint,
  scissors: Scissors,
  baby: Baby,
  smartphone: Smartphone,
  shirt: Shirt,
  gamepad2: Gamepad2,
  utensils: Utensils,
  dog: Dog,
  flower2: Flower2,
  hammer: Hammer,
  piggybank: PiggyBank,
  briefcase: Briefcase,
  ticket: Ticket,
  music: Music,
  film: Film,
  wrench: Wrench,
  droplets: Droplets,
  phone: Phone,
  camera: Camera,
};

export const DEFAULT_CATEGORY_ICON = "receipt";

/** Never throws: an unknown or missing key falls back to the receipt icon. */
export function getCategoryIconByKey(key: string | undefined | null): LucideIcon {
  if (!key) return CATEGORY_ICONS[DEFAULT_CATEGORY_ICON];
  return CATEGORY_ICONS[key] ?? CATEGORY_ICONS[DEFAULT_CATEGORY_ICON];
}

/** Ordered list of registry keys, used to render the icon picker. */
export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function isCategoryIconKey(key: unknown): key is string {
  return typeof key === "string" && key in CATEGORY_ICONS;
}
