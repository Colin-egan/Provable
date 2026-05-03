import type { Customer } from "@prisma/client";

export type ITTResult = {
  ittEstimate: number;
  ittSe: number;
  ittCiLower: number;
  ittCiUpper: number;
  ittPValue: number;
  ittSignificant: boolean;
  openRateTreatment: number;
  openRateControl: number;
  nTreatment: number;
  nControl: number;
  warnings: string[];
  // LATE fields — Phase 2
  lateEstimate: null;
  lateSe: null;
  lateCiLower: null;
  lateCiUpper: null;
  firstStageF: null;
  weakInstrument: null;
};

function sampleVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
}

// Abramowitz & Stegun normal CDF approximation → two-tailed p-value
function pFromZ(z: number): number {
  const a = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * a);
  const poly =
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return Math.min(1, 2 * 0.3989423 * Math.exp(-0.5 * a * a) * poly);
}

export function computeITT({
  customers,
  outcomeWindowDays,
  launchedAt,
}: {
  customers: Customer[];
  outcomeWindowDays: number;
  launchedAt: Date | null;
}): ITTResult {
  const treatment = customers.filter((c) => c.group === "TREATMENT");
  const control = customers.filter((c) => c.group === "CONTROL");

  const tRev = treatment.map((c) => c.revenue ?? 0);
  const cRev = control.map((c) => c.revenue ?? 0);

  const nTreatment = tRev.length;
  const nControl = cRev.length;

  const meanT = nTreatment > 0 ? tRev.reduce((a, b) => a + b, 0) / nTreatment : 0;
  const meanC = nControl > 0 ? cRev.reduce((a, b) => a + b, 0) / nControl : 0;

  const ittEstimate = meanT - meanC;

  // Welch's standard error
  const se = Math.sqrt(
    sampleVariance(tRev) / Math.max(nTreatment, 1) +
      sampleVariance(cRev) / Math.max(nControl, 1)
  );

  const ittSe = se;
  const z = se > 0 ? ittEstimate / se : 0;
  const ittPValue = se > 0 ? pFromZ(z) : 1;
  const ittCiLower = ittEstimate - 1.96 * se;
  const ittCiUpper = ittEstimate + 1.96 * se;
  const ittSignificant = ittCiLower > 0 || ittCiUpper < 0;

  const openRateTreatment =
    nTreatment > 0 ? treatment.filter((c) => c.emailOpenedAt).length / nTreatment : 0;
  const openRateControl =
    nControl > 0 ? control.filter((c) => c.emailOpenedAt).length / nControl : 0;

  const warnings: string[] = [];
  if (nTreatment < 200)
    warnings.push(
      `Treatment group has only ${nTreatment} customers. Results may be imprecise with this sample size.`
    );
  if (nControl < 200)
    warnings.push(
      `Control group has only ${nControl} customers. Results may be imprecise with this sample size.`
    );
  if (openRateControl > 0)
    warnings.push(
      "Some control-group customers show email opens, which shouldn't happen if they weren't sent an email. This may indicate a data quality issue."
    );

  const windowCloseTime = launchedAt
    ? launchedAt.getTime() + outcomeWindowDays * 86_400_000
    : null;
  if (!windowCloseTime || windowCloseTime > Date.now()) {
    warnings.push(
      `Your ${outcomeWindowDays}-day outcome window hasn't closed yet. Results may change as more purchases come in.`
    );
  }

  return {
    ittEstimate,
    ittSe,
    ittCiLower,
    ittCiUpper,
    ittPValue,
    ittSignificant,
    openRateTreatment,
    openRateControl,
    nTreatment,
    nControl,
    warnings,
    lateEstimate: null,
    lateSe: null,
    lateCiLower: null,
    lateCiUpper: null,
    firstStageF: null,
    weakInstrument: null,
  };
}
