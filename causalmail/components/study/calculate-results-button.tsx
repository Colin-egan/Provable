"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { calculateResults } from "@/actions/calculate-results";
import { toast } from "sonner";

type Props = {
  studyId: string;
  windowClosed: boolean;
};

export function CalculateResultsButton({ studyId, windowClosed }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  function handleConfirm() {
    setLoading(true);
    startTransition(async () => {
      try {
        await calculateResults(studyId);
        router.refresh();
        setOpen(false);
      } catch {
        toast.error("Failed to calculate results. Please try again.");
      } finally {
        setLoading(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={windowClosed ? "default" : "outline"} size="sm" />
        }
      >
        Calculate Results
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calculate results</DialogTitle>
          <DialogDescription>
            {windowClosed
              ? "Your outcome window has closed. This will compute the final ITT estimate from the revenue data you've entered."
              : "⚠️ Your outcome window hasn't closed yet. Results may change as more purchases come in. You can still calculate early results."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Calculating…" : "Calculate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
