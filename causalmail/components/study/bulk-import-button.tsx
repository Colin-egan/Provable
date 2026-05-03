"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { bulkImportRevenue } from "@/actions/customers";

type Props = {
  studyId: string;
  field?: "revenue" | "baselineRevenue";
  label?: string;
};
type RevenueRow = { email: string; revenue: number };

export function BulkImportButton({
  studyId,
  field = "revenue",
  label = "Bulk Import Revenue",
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RevenueRow[]>([]);
  const [parsed, setParsed] = useState<RevenueRow[]>([]);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setError(null);
    setPreview([]);
    setParsed([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    reset();

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete({ data, meta }) {
        const cols = meta.fields ?? [];
        if (!cols.includes("email") || !cols.includes("revenue")) {
          setError('CSV must have "email" and "revenue" columns.');
          return;
        }

        const rows: RevenueRow[] = [];
        for (const row of data) {
          const email = row.email?.trim().toLowerCase();
          const revenue = parseFloat(row.revenue);
          if (!email || isNaN(revenue) || revenue < 0) continue;
          rows.push({ email, revenue });
        }

        if (rows.length === 0) {
          setError("No valid rows found.");
          return;
        }

        setParsed(rows);
        setPreview(rows.slice(0, 5));
      },
      error(err) {
        setError(`Parse error: ${err.message}`);
      },
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const { updatedCount } = await bulkImportRevenue(studyId, parsed, field);
        toast.success(`Updated ${updatedCount} of ${parsed.length} customers.`);
        setOpen(false);
        reset();
        router.refresh();
      } catch {
        toast.error("Import failed. Please try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {label}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk import revenue</DialogTitle>
          <DialogDescription>
            Upload a CSV with <code>email</code> and <code>revenue</code>{" "}
            columns. Existing revenue values will be overwritten.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="text-sm"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Preview ({parsed.length} rows total)
              </p>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>${r.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={parsed.length === 0 || isPending}
          >
            {isPending ? "Importing…" : `Import ${parsed.length} rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
