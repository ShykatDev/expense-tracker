import { PageTransition } from "@/components/layout/page-transition";
import { CategoriesView } from "@/components/categories/categories-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories · Pulse",
};

export default function CategoriesPage() {
  return (
    <PageTransition>
      <CategoriesView />
    </PageTransition>
  );
}
