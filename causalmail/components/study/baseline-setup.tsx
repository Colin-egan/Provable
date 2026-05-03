"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerInput } from "@/lib/randomize";

type Props = {
  customers: CustomerInput[];
  onComplete: (customers: CustomerInput[]) => void;
};

type Mode = "none" | "csv" | "flat";

export function BaselineSetup({ customers, onComplete }: Props) {
  const [mode, setMode] = useState<Mode>("none");
  const [flatValue, setFlatValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [csvMatched, setCsvMatched] = useState<number | null>(null);
  const [pendingCustomers, setPendingCustomers] = useState<CustomerInput[]>(customers);

  function handleNone() {
    onComplete(customers);
  }

  function handleFlat() {
    const val = parseFloat(flatValue);
    if (isNaN(val) || val < 0) {
      setError("Enter a valid non-negative number.");
      return;
    }
    onComplete(customers.map((c) => ({ ...c, baselineRevenue: val })));
  }

  function handleCsvFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    setCsvMatched(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete({ data, meta }) {
        const cols = (meta.fields ?? []).map((c) => c.toLowerCase());
        if (!cols.includes("email") || !cols.includes("baseline_revenue")) {
          setError('CSV must have "email" and "baseline_revenue" columns.');
          return;
        }

        const lookup = new Map<string, number>();
        for (const raw of data) {
          const row: Record<string, string> = {};
          for (const [k, v] of Object.entries(raw)) row[k.toLowerCase()] = v as string;
          const email = row.email?.trim().toLowerCase();
          const rev = parseFloat(row.baseline_revenue);
          if (email && !isNaN(rev) && rev >= 0) lookup.set(email, rev);
        }

        let matched = 0;
        const updated = customers.map((c) => {
          const rev = lookup.get(c.email.toLowerCase());
          if (rev !== undefined) { matched++; return { ...c, baselineRevenue: rev }; }
          return c;
        });
        setCsvMatched(matched);
        setPendingCustomers(updated);
      },
      error(err) {
        setError(`Parse error: ${err.message}`);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Baseline spending data (optional)</h2>
        <p className="text-sm text-muted-foreground">
          How much did each customer spend <strong>before</strong> this campaign? Adding this
          improves accuracy by accounting for differences in customer spending habits.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card
          className={`cursor-pointer border-2 transition-colors ${mode === "none" ? "border-primary" : "border-border"}`}
          onClick={() => setMode("none")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">No baseline data</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Analysis uses simple difference in means. Fine for most campaigns.
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border-2 transition-colors ${mode === "csv" ? "border-primary" : "border-border"}`}
          onClick={() => setMode("csv")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upload baseline CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              CSV with <code>email</code> and <code>baseline_revenue</code> columns.
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border-2 transition-colors ${mode === "flat" ? "border-primary" : "border-border"}`}
          onClick={() => setMode("flat")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Flat baseline</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Apply a single average monthly revenue to all customers.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {mode === "csv" && (
        <div className="flex flex-col gap-3">
          <input
            type="file"
            accept=".csv"
            className="text-sm"
            onChange={(e) => handleCsvFile(e.target.files?.[0])}
          />
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {csvMatched !== null && (
            <p className="text-sm text-muted-foreground">
              Matched baseline revenue for {csvMatched} of {customers.length} customers.
            </p>
          )}
        </div>
      )}

      {mode === "flat" && (
        <div className="flex flex-col gap-2 max-w-xs">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <Label htmlFor="flat">Average monthly revenue per customer ($)</Label>
          <Input
            id="flat"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={flatValue}
            onChange={(e) => { setFlatValue(e.target.value); setError(null); }}
          />
        </div>
      )}

      <div className="flex gap-3">
        {mode === "none" && (
          <Button onClick={handleNone}>Continue without baseline →</Button>
        )}
        {mode === "csv" && (
          <Button
            onClick={() => onComplete(pendingCustomers)}
            disabled={csvMatched === null || !!error}
          >
            Continue with baseline data →
          </Button>
        )}
        {mode === "flat" && (
          <Button onClick={handleFlat}>Apply flat baseline →</Button>
        )}
      </div>
    </div>
  );
}
