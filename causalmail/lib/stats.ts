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
};

export type AdjustedITTResult = {
  ittAdjustedEstimate: number;
  ittAdjustedSe: number;
  ittAdjustedCiLower: number;
  ittAdjustedCiUpper: number;
  ittAdjustedSignificant: boolean;
};

export type LATEResult = {
  lateEstimate: number | null;
  lateSe: number | null;
  lateCiLower: number | null;
  lateCiUpper: number | null;
  firstStageF: number | null;
  weakInstrument: boolean | null;
};

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sampleVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

// Abramowitz & Stegun normal CDF approximation → two-tailed p-value
function pFromZ(z: number): number {
  const a = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * a);
  const poly =
    t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return Math.min(1, 2 * 0.3989423 * Math.exp(-0.5 * a * a) * poly);
}

function welchTest(aVals: number[], bVals: number[]): { estimate: number; se: number; pValue: number; ciLower: number; ciUpper: number; significant: boolean } {
  const nA = aVals.length;
  const nB = bVals.length;
  const mA = nA > 0 ? mean(aVals) : 0;
  const mB = nB > 0 ? mean(bVals) : 0;
  const estimate = mA - mB;
  const se = Math.sqrt(sampleVariance(aVals) / Math.max(nA, 1) + sampleVariance(bVals) / Math.max(nB, 1));
  const z = se > 0 ? estimate / se : 0;
  const pValue = se > 0 ? pFromZ(z) : 1;
  const ciLower = estimate - 1.96 * se;
  const ciUpper = estimate + 1.96 * se;
  return { estimate, se, pValue, ciLower, ciUpper, significant: ciLower > 0 || ciUpper < 0 };
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

  // Include revenue=0 (real data), exclude revenue=null (no data entered)
  const tRev = treatment.filter((c) => c.revenue !== null).map((c) => c.revenue as number);
  const cRev = control.filter((c) => c.revenue !== null).map((c) => c.revenue as number);

  const nTreatment = tRev.length;
  const nControl = cRev.length;

  const { estimate, se, pValue, ciLower, ciUpper, significant } = welchTest(tRev, cRev);

  const openRateTreatment =
    treatment.length > 0 ? treatment.filter((c) => c.emailOpenedAt).length / treatment.length : 0;
  // Control was never emailed; any apparent opens are data quality issues, not real opens
  const openRateControl = 0;

  const warnings: string[] = [];
  if (nTreatment < 200)
    warnings.push(`Treatment group has only ${nTreatment} customers with revenue data. Results may be imprecise.`);
  if (nControl < 200)
    warnings.push(`Control group has only ${nControl} customers with revenue data. Results may be imprecise.`);

  const rawControlOpens = control.filter((c) => c.emailOpenedAt).length;
  if (rawControlOpens > 0)
    warnings.push(
      `${rawControlOpens} control-group customer(s) show email opens. Control customers were never sent an email — this may indicate a data quality issue.`
    );

  const windowCloseTime = launchedAt
    ? launchedAt.getTime() + outcomeWindowDays * 86_400_000
    : null;
  if (!windowCloseTime || windowCloseTime > Date.now())
    warnings.push(`Your ${outcomeWindowDays}-day outcome window hasn't closed yet. Results may change as more revenue comes in.`);

  return {
    ittEstimate: estimate,
    ittSe: se,
    ittCiLower: ciLower,
    ittCiUpper: ciUpper,
    ittPValue: pValue,
    ittSignificant: significant,
    openRateTreatment,
    openRateControl,
    nTreatment,
    nControl,
    warnings,
  };
}

export function computeAdjustedITT(customers: Customer[]): AdjustedITTResult | null {
  const treatment = customers.filter(
    (c) => c.group === "TREATMENT" && c.revenue !== null && c.baselineRevenue !== null
  );
  const control = customers.filter(
    (c) => c.group === "CONTROL" && c.revenue !== null && c.baselineRevenue !== null
  );

  if (treatment.length < 2 || control.length < 2) return null;

  // Difference-in-differences: (post - pre) for each customer
  const tDiff = treatment.map((c) => (c.revenue as number) - (c.baselineRevenue as number));
  const cDiff = control.map((c) => (c.revenue as number) - (c.baselineRevenue as number));

  const { estimate, se, ciLower, ciUpper, significant } = welchTest(tDiff, cDiff);

  return {
    ittAdjustedEstimate: estimate,
    ittAdjustedSe: se,
    ittAdjustedCiLower: ciLower,
    ittAdjustedCiUpper: ciUpper,
    ittAdjustedSignificant: significant,
  };
}

const NULL_LATE: LATEResult = {
  lateEstimate: null,
  lateSe: null,
  lateCiLower: null,
  lateCiUpper: null,
  firstStageF: null,
  weakInstrument: null,
};

export function computeLATE({
  customers,
  engagementType,
  ittResult,
}: {
  customers: Customer[];
  engagementType: "opens" | "clicks";
  ittResult: ITTResult;
}): LATEResult {
  const treatment = customers.filter((c) => c.group === "TREATMENT");
  const nT = treatment.length;
  if (nT === 0) return NULL_LATE;

  const engaged =
    engagementType === "clicks"
      ? treatment.filter((c) => c.emailClickedAt).length
      : treatment.filter((c) => c.emailOpenedAt).length;

  const pT = engaged / nT;

  // Control group was never emailed → their engagement rate is 0
  // So first stage = pT - 0 = pT, SE = sqrt(pT*(1-pT)/nT)
  if (pT < 0.001) return NULL_LATE;

  const seEngT = Math.sqrt((pT * (1 - pT)) / nT);
  // F = (pT / SE(pT))^2
  const firstStageF = seEngT > 0 ? (pT / seEngT) ** 2 : 0;
  const weakInstrument = firstStageF < 10;

  // Wald estimator
  const lateEstimate = ittResult.ittEstimate / pT;

  // Delta method SE
  const lateSe = Math.sqrt(
    (ittResult.ittSe / pT) ** 2 + ((lateEstimate * seEngT) / pT) ** 2
  );

  return {
    lateEstimate,
    lateSe,
    lateCiLower: lateEstimate - 1.96 * lateSe,
    lateCiUpper: lateEstimate + 1.96 * lateSe,
    firstStageF,
    weakInstrument,
  };
}
