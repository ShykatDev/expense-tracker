import { CategoriesView } from "@/components/categories/categories-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories · Expense Tracker",
};

export default function CategoriesPage() {
  return <CategoriesView />;
}
