"use client";

import { Check, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Transaction } from "@/lib/transactions";

export function EditTransactionDrawer({
  transaction,
  onOpenChange,
  onSave,
}: {
  transaction: Transaction | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: { category: string; amount: number }) => void;
}) {
  const [category, setCategory] = React.useState("");
  const [amount, setAmount] = React.useState("");

  React.useEffect(() => {
    if (transaction) {
      setCategory(transaction.category);
      setAmount(String(transaction.amount));
    }
  }, [transaction]);

  function handleSave() {
    if (!transaction) return;
    const numericAmount = Number(amount);
    if (!category.trim() || !(numericAmount > 0)) {
      toast.error("Enter a category and a valid amount");
      return;
    }
    onSave(transaction.id, { category: category.trim(), amount: numericAmount });
    toast.success("Entry updated");
    onOpenChange(false);
  }

  return (
    <Drawer open={transaction !== null} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit entry</DrawerTitle>
          <DrawerDescription>Update the category or amount.</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-6 pb-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DrawerFooter>
          <Button className="gap-2" onClick={handleSave}>
            <Check className="size-4" />
            Save changes
          </Button>
          <DrawerClose render={<Button variant="outline" className="gap-2" />}>
            <X className="size-4" />
            Cancel
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
