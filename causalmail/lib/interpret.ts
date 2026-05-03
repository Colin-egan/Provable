import type { StudyResult } from "@prisma/client";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
}

export function interpretITT(result: StudyResult): string {
  const { ittEstimate, ittSignificant, ittCiLower, ittCiUpper } = result;
  if (ittEstimate === null || ittSignificant === null) return "";

  if (!ittSignificant) {
    return "We couldn't detect a clear effect. The email may have had too small an impact to measure with this sample size, or it may not have worked. Try a larger list or a stronger offer.";
  }

  if (ittEstimate > 0) {
    return `This email worked. It caused an estimated ${fmt(ittEstimate)} of additional revenue per customer (95% CI: ${fmt(ittCiLower!)} to ${fmt(ittCiUpper!)}).`;
  }

  return `This email was associated with an estimated ${fmt(ittEstimate)} decrease in revenue per customer (95% CI: ${fmt(ittCiLower!)} to ${fmt(ittCiUpper!)}). The negative effect is statistically significant.`;
}

export function interpretDashboardInsights(studies: {
  name: string;
  results: StudyResult | null;
}[]): string[] {
  const completed = studies.filter((s) => s.results?.ittEstimate !== null);
  if (completed.length === 0) return [];

  const insights: string[] = [];

  const best = completed.reduce((a, b) =>
    (a.results!.ittEstimate ?? -Infinity) > (b.results!.ittEstimate ?? -Infinity) ? a : b
  );
  insights.push(
    `Your most effective campaign was "${best.name}" with an estimated ${fmt(best.results!.ittEstimate!)} effect per customer.`
  );

  if (completed.length >= 2) {
    const estimates = completed.map((s) => s.results!.ittEstimate!);
    const avg = estimates.reduce((a, b) => a + b, 0) / estimates.length;
    insights.push(
      `Your average causal effect across ${completed.length} completed studies is ${fmt(avg)} per customer.`
    );
  }

  return insights;
}
