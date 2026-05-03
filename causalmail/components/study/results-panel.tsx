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

function instrumentStrength(f: number): string {
  if (f > 10) return "Strong instrument";
  if (f >= 5) return "Moderate instrument — interpret with caution";
  return "Weak instrument — focus on the ITT estimate instead";
}

type Props = { result: StudyResult };

export function ResultsPanel({ result }: Props) {
  const {
    ittEstimate,
    ittCiLower,
    ittCiUpper,
    ittPValue,
    ittSignificant,
    lateEstimate,
    lateCiLower,
    lateCiUpper,
    firstStageF,
    weakInstrument,
    nTreatment,
    nControl,
    openRateTreatment,
    openRateControl,
    warnings,
  } = result;

  const hasLATE = lateEstimate !== null;
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

  const gridCols = hasLATE ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className="flex flex-col gap-4">
      <div className={`grid gap-4 ${gridCols}`}>
        {/* Card 1: ITT Effect */}
        <Card className={`col-span-1 ${ittColor}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-base ${ittTextColor}`}>
              ITT Effect{" "}
              <span className="text-xs font-normal opacity-70">
                (effect of sending)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className={`text-3xl font-bold ${ittTextColor}`}>
              {ittEstimate !== null ? fmt(ittEstimate) : "—"}
            </p>
            {ittCiLower !== null && ittCiUpper !== null && (
              <p className={`text-xs ${ittTextColor} opacity-80`}>
                95% CI: {fmt(ittCiLower)} to {fmt(ittCiUpper)}
              </p>
            )}
            {ittPValue !== null && (
              <div className="flex items-center gap-2">
                <Badge variant={significant ? "default" : "secondary"}>
                  {significant ? "Significant" : "Not significant"}
                </Badge>
                <span className="text-xs opacity-70">
                  p = {ittPValue.toFixed(3)}
                </span>
              </div>
            )}
            <p className={`text-sm ${ittTextColor} opacity-90`}>
              {interpretITT(result)}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: LATE Effect (only shown when engagement data exists) */}
        {hasLATE && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-1.5">
                LATE Effect{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (effect of reading)
                </span>
                <span
                  title="This estimates the effect for people who actually read your email, not just everyone you sent it to. It's always larger than the ITT because it focuses on the people who engaged."
                  className="text-muted-foreground cursor-help text-xs"
                >
                  ℹ️
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-3xl font-bold">{fmt(lateEstimate!)}</p>
              {lateCiLower !== null && lateCiUpper !== null && (
                <p className="text-xs text-muted-foreground">
                  95% CI: {fmt(lateCiLower)} to {fmt(lateCiUpper)}
                </p>
              )}
              {firstStageF !== null && (
                <div className="flex items-center gap-2">
                  {weakInstrument && (
                    <Badge variant="secondary">Weak instrument</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    F = {firstStageF.toFixed(1)} · {instrumentStrength(firstStageF)}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground opacity-90">
                {interpretLATE(result)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Card 3: Diagnostics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Stat label="Treatment group" value={`${nTreatment ?? "—"} customers`} />
            <Stat label="Control group" value={`${nControl ?? "—"} customers`} />
            {openRateTreatment !== null && (
              <Stat
                label="Open rate (treatment)"
                value={fmtPct(openRateTreatment)}
              />
            )}
            {openRateControl !== null && (
              <Stat
                label="Open rate (control)"
                value={fmtPct(openRateControl)}
              />
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
