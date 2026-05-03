"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { interpretITT, interpretLATE } from "@/lib/interpret";
import type { StudyResult } from "@prisma/client";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

type Props = { result: StudyResult };

export function ResultsPanel({ result }: Props) {
  const [engagementType, setEngagementType] = useState<"clicks" | "opens">("clicks");

  const {
    ittEstimate,
    ittCiLower,
    ittCiUpper,
    ittPValue,
    ittSignificant,
    ittAdjustedEstimate,
    ittAdjustedCiLower,
    ittAdjustedCiUpper,
    ittAdjustedSignificant,
    // Clicks-based LATE
    lateEstimate,
    lateSe,
    lateCiLower,
    lateCiUpper,
    firstStageF,
    weakInstrument,
    // Opens-based LATE
    lateEstimateOpens,
    lateSeOpens,
    lateCiLowerOpens,
    lateCiUpperOpens,
    firstStageFOpens,
    weakInstrumentOpens,
    nTreatment,
    nControl,
    openRateTreatment,
    warnings,
  } = result;

  const hasAdjusted = ittAdjustedEstimate !== null;

  // Select which LATE fields to display based on toggle
  const late = engagementType === "clicks"
    ? { estimate: lateEstimate, se: lateSe, ciLower: lateCiLower, ciUpper: lateCiUpper, f: firstStageF, weak: weakInstrument }
    : { estimate: lateEstimateOpens, se: lateSeOpens, ciLower: lateCiLowerOpens, ciUpper: lateCiUpperOpens, f: firstStageFOpens, weak: weakInstrumentOpens };

  const hasLATE = late.estimate !== null;

  const significant = ittSignificant ?? false;
  const positive = (ittEstimate ?? 0) >= 0;

  const ittColor = !significant
    ? "bg-muted"
    : positive
    ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
    : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
  const ittTextColor = !significant
    ? "text-foreground"
    : positive
    ? "text-green-900 dark:text-green-100"
    : "text-red-900 dark:text-red-100";

  const adjSignificant = ittAdjustedSignificant ?? false;
  const adjPositive = (ittAdjustedEstimate ?? 0) >= 0;
  const adjColor = !adjSignificant
    ? "bg-muted"
    : adjPositive
    ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
    : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
  const adjTextColor = !adjSignificant
    ? "text-foreground"
    : adjPositive
    ? "text-green-900 dark:text-green-100"
    : "text-red-900 dark:text-red-100";

  const cardCount = 1 + (hasAdjusted ? 1 : 0) + (hasLATE ? 1 : 0) + 1; // +1 diagnostics
  const gridCols =
    cardCount <= 2 ? "sm:grid-cols-2" : cardCount === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="flex flex-col gap-4">
      <div className={`grid gap-4 ${gridCols}`}>
        {/* Card 1: Simple ITT */}
        <Card className={ittColor}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-base ${ittTextColor}`}>
              {hasAdjusted ? "Effect of sending (simple)" : "Revenue impact per customer"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className={`text-3xl font-bold ${ittTextColor}`}>
              {ittEstimate !== null ? fmt(ittEstimate) : "—"}
            </p>
            {ittCiLower !== null && ittCiUpper !== null && (
              <p className={`text-xs ${ittTextColor} opacity-80`}>
                Likely range: {fmt(ittCiLower)} to {fmt(ittCiUpper)}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Badge variant={significant ? "default" : "secondary"}>
                {significant ? "Reliable result" : "Inconclusive"}
              </Badge>
            </div>
            <p className={`text-sm ${ittTextColor} opacity-90`}>
              {interpretITT(result)}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Adjusted ITT (DiD) — only when baseline exists */}
        {hasAdjusted && (
          <Card className={adjColor}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-base flex items-center gap-1.5 ${adjTextColor}`}>
                Effect of sending (baseline-adjusted)
                <span
                  title="This accounts for differences in how much customers were already spending before your email. If both estimates are similar, your randomization worked well."
                  className="cursor-help text-xs opacity-70"
                >
                  ℹ️
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className={`text-3xl font-bold ${adjTextColor}`}>
                {fmt(ittAdjustedEstimate!)}
              </p>
              {ittAdjustedCiLower !== null && ittAdjustedCiUpper !== null && (
                <p className={`text-xs ${adjTextColor} opacity-80`}>
                  Likely range: {fmt(ittAdjustedCiLower)} to {fmt(ittAdjustedCiUpper)}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Badge variant={adjSignificant ? "default" : "secondary"}>
                  {adjSignificant ? "Reliable result" : "Inconclusive"}
                </Badge>
              </div>
              <p className={`text-xs ${adjTextColor} opacity-70`}>
                Adjusted for baseline spending differences between groups.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Card 3: LATE — only when engagement data exists */}
        {hasLATE && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-1.5">
                Impact on engaged customers
                <span
                  title="Estimated revenue effect for customers who actually opened or clicked your email, using group assignment as an instrument. Always larger than the overall effect."
                  className="text-muted-foreground cursor-help text-xs"
                >
                  ℹ️
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Opens/clicks toggle */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground mr-1">Based on:</span>
                <button
                  onClick={() => setEngagementType("clicks")}
                  className={`px-2 py-0.5 rounded ${engagementType === "clicks" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  Clicks
                </button>
                <button
                  onClick={() => setEngagementType("opens")}
                  className={`px-2 py-0.5 rounded ${engagementType === "opens" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  Opens
                </button>
              </div>
              {engagementType === "opens" && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Note: Apple Mail automatically marks emails as opened, so clicks are more reliable.
                </p>
              )}
              <p className="text-3xl font-bold">{fmt(late.estimate!)}</p>
              {late.ciLower !== null && late.ciUpper !== null && (
                <p className="text-xs text-muted-foreground">
                  Likely range: {fmt(late.ciLower)} to {fmt(late.ciUpper)}
                </p>
              )}
              {late.weak && (
                <Badge variant="secondary">Low engagement — interpret with caution</Badge>
              )}
              <p className="text-sm text-muted-foreground opacity-90">
                {interpretLATE(result)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Card: Diagnostics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Stat label="Treatment group" value={`${nTreatment ?? "—"} customers`} />
            <Stat label="Control group" value={`${nControl ?? "—"} customers`} />
            {openRateTreatment !== null && openRateTreatment !== undefined && (
              <Stat label="Open rate (treatment)" value={fmtPct(openRateTreatment)} />
            )}
            {ittPValue !== null && ittPValue !== undefined && (
              <Stat label="p-value" value={ittPValue.toFixed(3)} />
            )}
            {late.f !== null && late.f !== undefined && (
              <Stat label="First-stage F" value={late.f.toFixed(1)} />
            )}
          </CardContent>
        </Card>
      </div>

      {warnings && warnings.length > 0 && (
        <Alert>
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {warnings.map((w, i) => (
                <li key={i}>⚠️ {w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
