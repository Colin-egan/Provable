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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkImportTestData, type TestDataRow } from "@/actions/customers";

type Props = { studyId: string };

const BOOL_COLS = ["sent", "opened", "clicked", "bounced"] as const;
const NUM_COLS = ["revenue", "baseline_revenue"] as const;

function parseBool(v: string | undefined): boolean | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  return ["1", "true", "yes", "y"].includes(v.trim().toLowerCase());
}

function parseNum(v: string | undefined): number | null | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

export function TestImportButton({ studyId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<TestDataRow[]>([]);
  const [preview, setPreview] = useState<TestDataRow[]>([]);
  const [detectedCols, setDetectedCols] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setError(null);
    setParsed([]);
    setPreview([]);
    setDetectedCols([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    reset();

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete({ data, meta }) {
        const rawCols = (meta.fields ?? []).map((c) => c.toLowerCase());
        if (!rawCols.includes("email")) {
          setError('CSV must have an "email" column.');
          return;
        }

        const hasBool = BOOL_COLS.filter((c) => rawCols.includes(c));
        const hasNum = NUM_COLS.filter((c) => rawCols.includes(c));
        const active = [...hasBool, ...hasNum];

        if (active.length === 0) {
          setError('CSV needs at least one data column: sent, opened, clicked, bounced, revenue, baseline_revenue.');
          return;
        }

        const rows: TestDataRow[] = [];
        for (const raw of data) {
          const row: Record<string, string> = {};
          for (const [k, v] of Object.entries(raw)) row[k.toLowerCase()] = v as string;
          const email = row.email?.trim().toLowerCase();
          if (!email) continue;

          const entry: TestDataRow = { email };
          if (rawCols.includes("sent")) entry.sent = parseBool(row.sent);
          if (rawCols.includes("opened")) entry.opened = parseBool(row.opened);
          if (rawCols.includes("clicked")) entry.clicked = parseBool(row.clicked);
          if (rawCols.includes("bounced")) entry.bounced = parseBool(row.bounced);
          if (rawCols.includes("revenue")) entry.revenue = parseNum(row.revenue);
          if (rawCols.includes("baseline_revenue")) entry.baselineRevenue = parseNum(row.baseline_revenue);
          rows.push(entry);
        }

        if (rows.length === 0) {
          setError("No valid rows found.");
          return;
        }

        setParsed(rows);
        setPreview(rows.slice(0, 5));
        setDetectedCols(active);
      },
      error(err) {
        setError(`Parse error: ${err.message}`);
      },
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const { updatedCount } = await bulkImportTestData(studyId, parsed);
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
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Import Test Data
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import test data</DialogTitle>
          <DialogDescription>
            Upload a CSV to set customer variables for testing. Include any combination of columns:
            <code className="mx-1 text-xs bg-muted px-1 rounded">email</code>
            <code className="mx-1 text-xs bg-muted px-1 rounded">sent</code>
            <code className="mx-1 text-xs bg-muted px-1 rounded">opened</code>
            <code className="mx-1 text-xs bg-muted px-1 rounded">clicked</code>
            <code className="mx-1 text-xs bg-muted px-1 rounded">bounced</code>
            <code className="mx-1 text-xs bg-muted px-1 rounded">revenue</code>
            <code className="mx-1 text-xs bg-muted px-1 rounded">baseline_revenue</code>.
            Boolean columns accept: yes/no, true/false, 1/0.
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

          {detectedCols.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Detected columns: {detectedCols.join(", ")} · {parsed.length} rows
            </p>
          )}

          {preview.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    {detectedCols.map((c) => (
                      <TableHead key={c} className="capitalize">{c.replace("_", " ")}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.email}</TableCell>
                      {detectedCols.includes("sent") && <TableCell>{r.sent !== undefined ? (r.sent ? "yes" : "no") : "—"}</TableCell>}
                      {detectedCols.includes("opened") && <TableCell>{r.opened !== undefined ? (r.opened ? "yes" : "no") : "—"}</TableCell>}
                      {detectedCols.includes("clicked") && <TableCell>{r.clicked !== undefined ? (r.clicked ? "yes" : "no") : "—"}</TableCell>}
                      {detectedCols.includes("bounced") && <TableCell>{r.bounced !== undefined ? (r.bounced ? "yes" : "no") : "—"}</TableCell>}
                      {detectedCols.includes("revenue") && <TableCell>{r.revenue !== undefined && r.revenue !== null ? `$${r.revenue.toFixed(2)}` : "—"}</TableCell>}
                      {detectedCols.includes("baseline_revenue") && <TableCell>{r.baselineRevenue !== undefined && r.baselineRevenue !== null ? `$${r.baselineRevenue.toFixed(2)}` : "—"}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={parsed.length === 0 || isPending}>
            {isPending ? "Importing…" : `Import ${parsed.length} rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
