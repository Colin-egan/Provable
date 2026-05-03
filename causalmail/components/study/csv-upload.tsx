"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { CustomerInput } from "@/lib/randomize";

type Props = {
  onComplete: (customers: CustomerInput[]) => void;
};

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function CsvUpload({ onComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CustomerInput[]>([]);
  const [stats, setStats] = useState<{
    valid: number;
    invalid: number;
    duplicates: number;
  } | null>(null);
  const [parsed, setParsed] = useState<CustomerInput[]>([]);

  function processFile(file: File) {
    setError(null);
    setPreview([]);
    setStats(null);
    setParsed([]);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete({ data, meta }) {
        const cols = meta.fields ?? [];
        if (!cols.includes("email")) {
          setError('Your CSV must have an "email" column.');
          return;
        }

        const seen = new Set<string>();
        let invalid = 0;
        let duplicates = 0;
        const valid: CustomerInput[] = [];

        for (const row of data) {
          const email = row.email?.trim().toLowerCase();
          if (!email || !isValidEmail(email)) {
            invalid++;
            continue;
          }
          if (seen.has(email)) {
            duplicates++;
            continue;
          }
          seen.add(email);
          valid.push({
            email,
            externalId: row.customer_id?.trim() || row.external_id?.trim() || undefined,
          });
        }

        setParsed(valid);
        setPreview(valid.slice(0, 10));
        setStats({ valid: valid.length, invalid, duplicates });
      },
      error(err) {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }
    processFile(file);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors text-center ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
        <p className="text-xs text-muted-foreground">
          Required column: <code>email</code>. Optional:{" "}
          <code>customer_id</code> or <code>external_id</code>.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <>
          <div className="flex gap-4 text-sm">
            <span className="font-medium text-green-700 dark:text-green-400">
              {stats.valid} valid customers
            </span>
            {stats.invalid > 0 && (
              <span className="text-muted-foreground">
                {stats.invalid} invalid emails excluded
              </span>
            )}
            {stats.duplicates > 0 && (
              <span className="text-muted-foreground">
                {stats.duplicates} duplicates removed
              </span>
            )}
          </div>

          {stats.valid < 200 && (
            <Alert>
              <AlertDescription>
                ⚠️ Your list has fewer than 200 customers. Results may be
                imprecise — a larger list gives more reliable estimates.
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Preview (first {preview.length} rows)
              </p>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      {preview.some((r) => r.externalId) && (
                        <TableHead>External ID</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.email}</TableCell>
                        {preview.some((p) => p.externalId) && (
                          <TableCell>{r.externalId ?? "—"}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {stats.valid > 0 && (
            <Button onClick={() => onComplete(parsed)}>Continue →</Button>
          )}
        </>
      )}
    </div>
  );
}
