import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudyResult } from "@prisma/client";

type ComparisonStudy = {
  id: string;
  name: string;
  createdAt: Date;
  customers: { email: string }[];
  results: StudyResult;
};

type Props = { studies: ComparisonStudy[] };

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
}

function overlapPct(a: ComparisonStudy, b: ComparisonStudy): number {
  const setA = new Set(a.customers.map((c) => c.email.toLowerCase()));
  const overlap = b.customers.filter((c) => setA.has(c.email.toLowerCase())).length;
  const union = new Set([...a.customers.map((c) => c.email.toLowerCase()), ...b.customers.map((c) => c.email.toLowerCase())]).size;
  return union > 0 ? overlap / union : 0;
}

function pairSummary(a: ComparisonStudy, b: ComparisonStudy): string {
  const aEst = a.results.ittAdjustedEstimate ?? a.results.ittEstimate ?? 0;
  const bEst = b.results.ittAdjustedEstimate ?? b.results.ittEstimate ?? 0;
  const diff = bEst - aEst;
  const usingAdjusted = a.results.ittAdjustedEstimate !== null && b.results.ittAdjustedEstimate !== null;

  const direction = diff >= 0 ? "more" : "less";
  const label = usingAdjusted ? " (baseline-adjusted)" : "";

  const baselineNote =
    usingAdjusted &&
    a.results.ittEstimate !== null &&
    b.results.ittEstimate !== null &&
    Math.abs((a.results.ittEstimate ?? 0) - (b.results.ittEstimate ?? 0)) >
      Math.abs((a.results.ittAdjustedEstimate ?? 0) - (b.results.ittAdjustedEstimate ?? 0)) * 1.2
      ? " Note: baseline spending differed between campaigns — the adjusted estimates account for this."
      : "";

  return `Your "${b.name}" was ${fmt(Math.abs(diff))} ${direction} effective per customer than "${a.name}"${label}.${baselineNote}`;
}

export function CampaignComparison({ studies }: Props) {
  if (studies.length < 2) return null;

  // Sort by date ascending
  const sorted = [...studies].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Consecutive pairs
  const pairs: [ComparisonStudy, ComparisonStudy][] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    pairs.push([sorted[i], sorted[i + 1]]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Campaign Comparison</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {pairs.map(([a, b]) => {
          const overlap = overlapPct(a, b);
          const lowOverlap = overlap < 0.5;

          return (
            <div key={`${a.id}-${b.id}`} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{a.name} → {b.name}</span>
                  <span className="text-muted-foreground">{pairSummary(a, b)}</span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
                  <span>
                    {fmt(Math.abs(a.results.ittAdjustedEstimate ?? a.results.ittEstimate ?? 0))}
                    {" → "}
                    {fmt(Math.abs(b.results.ittAdjustedEstimate ?? b.results.ittEstimate ?? 0))}
                  </span>
                </div>
              </div>
              {lowOverlap && (
                <Alert>
                  <AlertDescription className="text-xs">
                    ⚠️ These campaigns used substantially different customer lists ({Math.round(overlap * 100)}% overlap), so direct comparison may not be meaningful.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
